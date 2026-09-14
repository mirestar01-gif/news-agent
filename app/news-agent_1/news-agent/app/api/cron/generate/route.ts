import { NextRequest, NextResponse } from "next/server";
import { getTopics } from "@/lib/topics";
import { runTopicPipeline } from "@/lib/newsAgent";
import { isPersistentStoreConfigured, saveTopicResult } from "@/lib/newsStore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron이 매일 아침(vercel.json에 설정된 시각) 호출하는 엔드포인트.
 * 모든 주제를 미리 검색→검증→요약해서 Redis에 저장해두면,
 * 사용자가 대시보드를 열 때 기다리지 않고 바로 결과를 볼 수 있습니다.
 *
 * 참고: Redis(UPSTASH_REDIS_REST_URL/TOKEN)가 설정돼 있지 않으면 저장할 곳이 없어
 * 이 엔드포인트는 그냥 미리 한 번 생성해보는 것 이상의 효과가 없습니다.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않아 생성을 건너뛰었습니다." },
      { status: 500 }
    );
  }

  const topics = getTopics();
  const persistent = isPersistentStoreConfigured();

  const results = await Promise.allSettled(
    topics.map(async (topic) => {
      const result = await runTopicPipeline(topic);
      await saveTopicResult(topic.id, result);
      return { topicId: topic.id, itemCount: result.items.filter((i) => i.verified).length };
    })
  );

  const summary = results.map((r, i) => ({
    topicId: topics[i].id,
    ok: r.status === "fulfilled",
    detail: r.status === "fulfilled" ? r.value : String(r.reason),
  }));

  const failedCount = summary.filter((s) => !s.ok).length;
  console.log("[news-agent cron]", JSON.stringify({ persistent, summary }));

  return NextResponse.json({
    persistentStoreConfigured: persistent,
    generatedAt: new Date().toISOString(),
    results: summary,
    warning: persistent
      ? undefined
      : "UPSTASH_REDIS_REST_URL / TOKEN이 설정되지 않아 결과가 저장되지 않았습니다. README를 참고해 연결해주세요.",
    ...(failedCount > 0 ? { failedCount } : {}),
  });
}
