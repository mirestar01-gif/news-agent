import { XMLParser } from "fast-xml-parser";

export type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

/**
 * Google News RSS는 인증 없이 무료로 사용 가능한 공개 피드입니다.
 * 별도 API 키나 유료 검색 API 없이 실시간 뉴스를 가져옵니다.
 */
export async function fetchTopicNews(topic: {
  query: string;
  hl: string;
  gl: string;
  ceid: string;
  count?: number;
}): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    topic.query
  )}&hl=${topic.hl}&gl=${topic.gl}&ceid=${topic.ceid}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (news-research-agent)" },
    // 5분 캐시 — 같은 데이터를 반복해서 재요청하지 않도록 해서 부하/응답속도 개선
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status}`);
  }

  const xml = await res.text();
  const json = parser.parse(xml);
  const rawItems = json?.rss?.channel?.item;
  const items: unknown[] = Array.isArray(rawItems)
    ? rawItems
    : rawItems
    ? [rawItems]
    : [];

  const count = topic.count ?? 6;

  return items.slice(0, count).map((raw) => {
    const item = raw as Record<string, unknown>;
    const rawTitle = String(item.title ?? "");
    // Google News 제목은 보통 "제목 - 출처" 형식
    const dashIdx = rawTitle.lastIndexOf(" - ");
    const title = dashIdx > -1 ? rawTitle.slice(0, dashIdx) : rawTitle;
    const source =
      dashIdx > -1
        ? rawTitle.slice(dashIdx + 3)
        : String(
            (item.source as Record<string, unknown>)?.["#text"] ?? "출처 미상"
          );

    return {
      title,
      link: String(item.link ?? ""),
      pubDate: String(item.pubDate ?? ""),
      source,
    };
  });
}
