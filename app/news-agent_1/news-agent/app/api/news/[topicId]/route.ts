import { NextRequest, NextResponse } from "next/server";
import { getTopicById } from "@/lib/topics";
import { runTopicPipeline, type TopicResult } from "@/lib/newsAgent";
import { getFreshTopicResult, getLastTopicResult, saveTopicResult } from "@/lib/newsStore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 같은 서버리스 인스턴스가 살아있는 동안만 유지되는 보조 캐시.
// (Redis가 설정돼 있지 않을 때의 대비책 — 배포 환경에 따라 언제든 초기화될 수 있음)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분
const memoryCache = new Map<string, { data: TopicResult; expiresAt: number }>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  const topic = getTopicById(topicId);
  if (!topic) {
    return NextResponse.json({ error: "존재하지 않는 주제입니다." }, { status: 404 });
  }

  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  if (!forceRefresh) {
    // 1순위: 새벽 크론이 미리 만들어둔 결과 (Redis)
    const persisted = await getFreshTopicResult(topicId);
    if (persisted) return NextResponse.json(persisted);

    // 2순위: 같은 함수 인스턴스의 메모리 캐시
    const cached = memoryCache.get(topicId);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 또는 Vercel 환경 변수에 키를 등록해주세요.",
      },
      { status: 500 }
    );
  }

  try {
    const result = await runTopicPipeline(topic);
    memoryCache.set(topicId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    await saveTopicResult(topicId, result); // 다음 방문·다음 크론을 위해 영구 저장
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[news-agent] ${topicId} 처리 실패:`, err);

    // 새로 생성은 실패했지만 예전 결과가 남아있다면 그거라도 보여준다.
    const stale = await getLastTopicResult(topicId);
    if (stale) {
      return NextResponse.json({
        ...stale,
        warning: "최신 정보를 가져오지 못해 이전 결과를 보여드리고 있어요.",
      });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
