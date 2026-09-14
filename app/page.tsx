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
    <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              오늘의 뉴스 브리핑
            </h1>
            {data && (
              <p className="mt-1 text-sm text-neutral-500">
                업데이트: {formatDate(data.generatedAt)}
              </p>
            )}
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            새로고침
          </button>
        </header>

        {data?.fx && (
          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-500">USD/KRW 기준 환율</p>
            <p className="text-2xl font-semibold text-neutral-900">
              {data.fx.rate.toFixed(2)}원
              <span className="ml-2 text-sm font-normal text-neutral-400">
                ({data.fx.date} 기준)
              </span>
            </p>
          </div>
        )}

        {loading && (
          <p className="text-neutral-500">뉴스를 불러오는 중입니다...</p>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {data?.topics.map((topic) => (
            <section
              key={topic.id}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                {topic.label}
              </h2>

              {topic.error && (
                <p className="text-sm text-red-500">{topic.error}</p>
              )}

              <ul className="space-y-3">
                {topic.items.map((item, i) => (
                  <li key={i} className="text-sm">
                    
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-neutral-800 hover:underline"
                    >
                      {item.title}
                    </a>
                    {item.originalTitle && (
                      <p className="mt-0.5 text-xs text-neutral-400 italic">
                        {item.originalTitle}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {item.source}
                      {item.pubDate ? ` · ${formatDate(item.pubDate)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-neutral-400">
          Google News RSS · Frankfurter 환율 API — 모두 무료 공개 API,
          별도 유료 API 키 없이 동작합니다.
        </footer>
      </div>
    </main>
  );
}