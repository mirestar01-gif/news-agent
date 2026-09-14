import { NextResponse } from "next/server";
import topics from "@/config/topics.json";
import { fetchTopicNews } from "@/lib/rss";
import { fetchUsdKrw } from "@/lib/fx";

export const revalidate = 300; // 5분마다 재검증 (Vercel Hobby 무료 범위)

export async function GET() {
  const results = await Promise.all(
    topics.map(async (topic) => {
      try {
        const items = await fetchTopicNews(topic);
        return { ...topic, items, error: null as string | null };
      } catch {
        return { ...topic, items: [], error: "뉴스를 불러오지 못했습니다." };
      }
    })
  );

  const fx = await fetchUsdKrw();

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    fx,
    topics: results,
  });
}
