import { getAnthropicClient, MODEL } from "./anthropicClient";
import type { Topic } from "./topics";

export type NewsItem = {
  title: string;
  url: string;
  date: string; // YYYY-MM-DD 또는 모델이 파악한 표현
  snippet: string;
};

export type VerifiedItem = NewsItem & {
  verified: boolean;
  verificationNote?: string;
};

export type TopicResult = {
  topicId: string;
  label: string;
  emoji: string;
  summary: string;
  items: VerifiedItem[];
  generatedAt: string;
  warning?: string;
};

/** 응답 텍스트에서 JSON 배열/객체만 추출합니다 (```json 코드펜스 대응). */
function extractJson<T>(text: string, fallback: T): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return fallback;
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
  if (end === -1 || end < start) return fallback;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}

function lastText(content: { type: string; text?: string }[]): string {
  const textBlocks = content.filter((b) => b.type === "text" && b.text);
  return textBlocks.map((b) => b.text).join("\n");
}

/** 1단계: 검색 에이전트 — 웹 검색 도구로 주제별 최신 뉴스를 수집합니다. */
export async function searchTopic(topic: Topic): Promise<NewsItem[]> {
  const client = getAnthropicClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");

  const today = new Date().toISOString().slice(0, 10);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      } as never,
    ],
    messages: [
      {
        role: "user",
        content:
          `오늘은 ${today}입니다. 다음 주제로 웹 검색을 수행해서 최신 뉴스를 4~6개 찾아줘.\n\n` +
          `주제: ${topic.label}\n검색 가이드: ${topic.searchQuery}\n\n` +
          `검색이 끝나면 반드시 아래 JSON 배열 형식으로만 최종 답변해줘 (설명 문장 없이 JSON만):\n` +
          `[{"title": "기사 제목", "url": "실제 기사 URL", "date": "YYYY-MM-DD", "snippet": "핵심 내용 한두 문장"}]\n` +
          `실제로 검색된 결과만 사용하고, url과 날짜는 검색 결과에 있는 그대로 정확히 옮겨줘. 확실하지 않은 날짜는 추측하지 말고 검색 스니펫에 보이는 대로만 적어줘.`,
      },
    ],
  });

  const text = lastText(message.content as never as { type: string; text?: string }[]);
  return extractJson<NewsItem[]>(text, []);
}

/** 2단계: 검증 에이전트 — 출처 URL 접근 가능 여부와 날짜·내용 정합성을 점검합니다. */
export async function verifyItems(topic: Topic, items: NewsItem[]): Promise<VerifiedItem[]> {
  if (items.length === 0) return [];

  // URL이 실제로 응답하는지 서버에서 직접 확인 (모델의 할루시네이션으로 만들어진 링크 거르기)
  const reachability = await Promise.all(
    items.map(async (item) => {
      try {
        const res = await fetch(item.url, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "Mozilla/5.0 (news-agent verifier)" },
        });
        return res.ok || (res.status >= 300 && res.status < 400);
      } catch {
        return false;
      }
    })
  );

  const client = getAnthropicClient();
  if (!client) {
    // API 키가 없으면 URL 접근성만으로 판단
    return items.map((item, i) => ({
      ...item,
      verified: reachability[i],
      verificationNote: reachability[i] ? undefined : "출처 링크에 접근할 수 없음",
    }));
  }

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content:
          `너는 뉴스 검증 담당이야. 아래는 "${topic.label}" 주제로 검색된 뉴스 후보 목록과, ` +
          `각 항목의 링크가 실제로 열리는지 여부(reachable)야. 각 항목에 대해:\n` +
          `- 날짜가 지나치게 오래되었거나(예: 검색 의도와 무관한 몇 년 전 기사) 미래 날짜처럼 이상하지 않은지\n` +
          `- 제목과 요약(snippet) 내용이 서로 모순되지 않는지\n` +
          `- reachable이 false인 항목은 무조건 verified=false로 처리\n` +
          `를 확인해서 JSON 배열로만 답해줘: [{"index": 0, "verified": true, "note": "간단한 사유(문제 없으면 빈 문자열)"}]\n\n` +
          `데이터:\n${JSON.stringify(
            items.map((item, i) => ({ index: i, ...item, reachable: reachability[i] })),
            null,
            2
          )}`,
      },
    ],
  });

  const text = lastText(message.content as never as { type: string; text?: string }[]);
  const verdicts = extractJson<{ index: number; verified: boolean; note?: string }[]>(text, []);

  return items.map((item, i) => {
    const verdict = verdicts.find((v) => v.index === i);
    const verified = verdict ? verdict.verified && reachability[i] : reachability[i];
    return {
      ...item,
      verified,
      verificationNote: verified ? undefined : verdict?.note || "출처 확인 실패",
    };
  });
}

/** 3단계: 요약 에이전트 — 검증된 항목만으로 3~5줄 요약을 만듭니다. */
export async function summarizeTopic(topic: Topic, verified: VerifiedItem[]): Promise<string> {
  const usable = verified.filter((v) => v.verified);
  if (usable.length === 0) return "검증된 최신 뉴스를 찾지 못했습니다. 잠시 후 다시 시도해주세요.";

  const client = getAnthropicClient();
  if (!client) {
    return usable
      .slice(0, 5)
      .map((v) => `- ${v.title} (${v.date})`)
      .join("\n");
  }

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content:
          `아래는 "${topic.label}" 주제로 검증까지 완료된 뉴스 항목들이야. ` +
          `이 내용만 근거로 삼아 한국어로 3~5줄 요약을 작성해줘. ` +
          `각 줄 끝에는 해당 내용의 근거가 된 기사 제목을 괄호로 표시해줘. 새로운 사실을 추가하지 마.\n\n` +
          JSON.stringify(usable, null, 2),
      },
    ],
  });

  return lastText(message.content as never as { type: string; text?: string }[]).trim();
}

/** 전체 파이프라인: 검색 → 검증 → 요약 */
export async function runTopicPipeline(topic: Topic): Promise<TopicResult> {
  const searched = await searchTopic(topic);
  const verified = await verifyItems(topic, searched);
  const summary = await summarizeTopic(topic, verified);

  const droppedCount = verified.filter((v) => !v.verified).length;

  return {
    topicId: topic.id,
    label: topic.label,
    emoji: topic.emoji,
    summary,
    items: verified,
    generatedAt: new Date().toISOString(),
    warning:
      droppedCount > 0
        ? `${droppedCount}건은 출처 확인에 실패해 요약에서 제외했습니다.`
        : undefined,
  };
}
