import { NextResponse } from "next/server";
import topics from "@/config/topics.json";
import { fetchTopicNews } from "@/lib/rss";
import { fetchUsdKrw } from "@/lib/fx";
import { translateToKorean } from "@/lib/translate";

export const revalidate = 300; // 5분마다 재검증 (Vercel Hobby 무료 범위)

export async function GET() {
  const results = await Promise.all(
    topics.map(async (topic) => {
      try {
        const items = await fetchTopicNews(topic);

        const finalItems = topic.translate
          ? await Promise.all(
              items.map(async (item) => {
                const translated = await translateToKorean(item.title);
                return {
                  ...item,
                  title: translated,
                  originalTitle:
                    translated !== item.title ? item.title : undefined,
                };
              })
            )
          : items;

        return { ...topic, items: finalItems, error: null as string | null };
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
