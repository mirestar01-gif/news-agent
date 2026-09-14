"use client";

import { useEffect, useState, useCallback } from "react";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  originalTitle?: string;
};

type Topic = {
  id: string;
  label: string;
  items: NewsItem[];
  error: string | null;
  showRate?: boolean;
  translate?: boolean;
};

type FxRate = {
  base: string;
  target: string;
  rate: number;
  date: string;
} | null;

type ApiResponse = {
  generatedAt: string;
  fx: FxRate;
  topics: Topic[];
};

const TOPIC_ACCENT: Record<string, { bar: string; dot: string; tint: string }> = {
  "ai-global": { bar: "border-[#5B4B8A]", dot: "bg-[#5B4B8A]", tint: "text-[#5B4B8A]" },
  "econ-global": { bar: "border-[#9C5A1D]", dot: "bg-[#9C5A1D]", tint: "text-[#9C5A1D]" },
  "econ-domestic": { bar: "border-[#1D6FA5]", dot: "bg-[#1D6FA5]", tint: "text-[#1D6FA5]" },
  "fx-usdkrw": { bar: "border-[#1F7A5C]", dot: "bg-[#1F7A5C]", tint: "text-[#1F7A5C]" },
};
const DEFAULT_ACCENT = { bar: "border-[#6B5B4B]", dot: "bg-[#6B5B4B]", tint: "text-[#6B5B4B]" };

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateline(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/news", { cache: "no-store" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-[#FAF6EF] text-[#262220]">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <header className="mb-8 border-b-2 border-[#262220] pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                오늘의 뉴스 브리핑
              </h1>
              {data && (
                <p className="mt-2 text-sm text-[#8A7F6E]">
                  {formatDateline(data.generatedAt)} 업데이트
                </p>
              )}
            </div>
            <button
              onClick={load}
              className="rounded-full border border-[#262220] px-4 py-1.5 text-sm font-medium text-[#262220] transition hover:bg-[#262220] hover:text-[#FAF6EF]"
            >
              새로고침
            </button>
          </div>
        </header>

        {data?.fx && (
          <div className="mb-10 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[#1F7A5C]/30 bg-[#1F7A5C]/[0.06] px-5 py-4">
            <span className="text-sm font-medium text-[#1F7A5C]">
              USD/KRW 기준 환율
            </span>
            <span className="text-3xl font-bold text-[#1F7A5C]">
              {data.fx.rate.toFixed(2)}원
            </span>
            <span className="text-sm text-[#8A7F6E]">({data.fx.date} 기준)</span>
          </div>
        )}

        {loading && (
          <p className="mb-6 text-[#8A7F6E]">뉴스를 불러오는 중입니다...</p>
        )}

        <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
          {data?.topics.map((topic) => {
            const accent = TOPIC_ACCENT[topic.id] ?? DEFAULT_ACCENT;
            return (
              <section key={topic.id} className={`border-t-4 ${accent.bar} pt-4`}>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                  <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                  {topic.label}
                </h2>

                {topic.error && (
                  <p className="text-sm text-red-600">{topic.error}</p>
                )}

                <ul className="divide-y divide-[#E4DDD0]">
                  {topic.items.map((item, i) => (
                    <li key={i} className="py-3 first:pt-0">
                      
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[15px] font-medium leading-snug text-[#262220] hover:underline"
                      >
                        {item.title}
                      </a>
                      {item.originalTitle && (
                        <p className="mt-1 text-xs italic text-[#A69C8C]">
                          {item.originalTitle}
                        </p>
                      )}
                      <p className={`mt-1 text-xs font-medium ${accent.tint}`}>
                        {item.source}
                        {item.pubDate ? (
                          <span className="font-normal text-[#8A7F6E]">
                            {" "}
                            · {formatDate(item.pubDate)}
                          </span>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-14 border-t border-[#E4DDD0] pt-6 text-center text-xs text-[#A69C8C]">
          Google News RSS · Frankfurter 환율 API — 모두 무료 공개 API,
          별도 유료 API 키 없이 동작합니다.
        </footer>
      </div>
    </main>
  );
}