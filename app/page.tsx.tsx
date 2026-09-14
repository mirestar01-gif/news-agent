"use client";

import { useEffect, useState, useCallback, CSSProperties } from "react";

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

// 커스텀 색상은 전부 인라인 style로 직접 지정합니다 (Tailwind arbitrary-value 클래스가
// 빌드 환경에 따라 누락되는 문제를 피하기 위함 — 항상 확실하게 적용되도록).
const PAGE_BG = "#FAF6EF";
const INK = "#262220";
const MUTED = "#8A7F6E";
const FAINT = "#A69C8C";
const RULE = "#E4DDD0";
const FX_GREEN = "#1F7A5C";

const TOPIC_ACCENT: Record<string, string> = {
  "ai-global": "#5B4B8A",
  "econ-global": "#9C5A1D",
  "econ-domestic": "#1D6FA5",
  "fx-usdkrw": FX_GREEN,
};
const DEFAULT_ACCENT = "#6B5B4B";

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

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    backgroundColor: PAGE_BG,
    color: INK,
  };

  return (
    <main style={pageStyle}>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <header
          className="mb-8 pb-5"
          style={{ borderBottom: `2px solid ${INK}` }}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                오늘의 뉴스 브리핑
              </h1>
              {data && (
                <p className="mt-2 text-sm" style={{ color: MUTED }}>
                  {formatDateline(data.generatedAt)} 업데이트
                </p>
              )}
            </div>
            <button
              onClick={load}
              className="rounded-full px-4 py-1.5 text-sm font-medium"
              style={{ border: `1px solid ${INK}`, color: INK }}
            >
              새로고침
            </button>
          </div>
        </header>

        {data?.fx && (
          <div
            className="mb-10 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg px-5 py-4"
            style={{
              border: `1px solid ${FX_GREEN}4D`,
              backgroundColor: `${FX_GREEN}0F`,
            }}
          >
            <span className="text-sm font-medium" style={{ color: FX_GREEN }}>
              USD/KRW 기준 환율
            </span>
            <span className="text-3xl font-bold" style={{ color: FX_GREEN }}>
              {data.fx.rate.toFixed(2)}원
            </span>
            <span className="text-sm" style={{ color: MUTED }}>
              ({data.fx.date} 기준)
            </span>
          </div>
        )}

        {loading && (
          <p className="mb-6" style={{ color: MUTED }}>
            뉴스를 불러오는 중입니다...
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
          {data?.topics.map((topic) => {
            const accent = TOPIC_ACCENT[topic.id] ?? DEFAULT_ACCENT;
            return (
              <section
                key={topic.id}
                className="pt-4"
                style={{ borderTop: `4px solid ${accent}` }}
              >
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent, display: "inline-block" }}
                  />
                  {topic.label}
                </h2>

                {topic.error && (
                  <p className="text-sm" style={{ color: "#B3261E" }}>
                    {topic.error}
                  </p>
                )}

                <ul>
                  {topic.items.map((item, i) => (
                    <li
                      key={i}
                      className="py-3"
                      style={
                        i === 0
                          ? { paddingTop: 0 }
                          : { borderTop: `1px solid ${RULE}` }
                      }
                    >
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[15px] font-medium leading-snug hover:underline"
                        style={{ color: INK }}
                      >
                        {item.title}
                      </a>
                      {item.originalTitle && (
                        <p
                          className="mt-1 text-xs italic"
                          style={{ color: FAINT }}
                        >
                          {item.originalTitle}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-medium" style={{ color: accent }}>
                        {item.source}
                        {item.pubDate ? (
                          <span className="font-normal" style={{ color: MUTED }}>
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

        <footer
          className="mt-14 pt-6 text-center text-xs"
          style={{ borderTop: `1px solid ${RULE}`, color: FAINT }}
        >
          Google News RSS · Frankfurter 환율 API — 모두 무료 공개 API,
          별도 유료 API 키 없이 동작합니다.
        </footer>
      </div>
    </main>
  );
}
