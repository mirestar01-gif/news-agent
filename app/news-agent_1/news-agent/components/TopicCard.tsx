"use client";

import { useCallback, useEffect, useState } from "react";
import type { Topic } from "@/lib/topics";
import type { TopicResult } from "@/lib/newsAgent";
import SpeakButton from "./SpeakButton";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TopicResult };

export default function TopicCard({ topic }: { topic: Topic }) {
  const [state, setState] = useState<State>({ status: "loading" });

  // 첫 statement가 await이므로 effect 안에서 호출해도 동기적으로 setState하지 않는다.
  const fetchData = useCallback(
    async (refresh: boolean) => {
      try {
        const res = await fetch(`/api/news/${topic.id}${refresh ? "?refresh=1" : ""}`);
        const json = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: json.error || "불러오기에 실패했습니다." });
          return;
        }
        setState({ status: "ready", data: json as TopicResult });
      } catch {
        setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
      }
    },
    [topic.id]
  );

  useEffect(() => {
    // 마운트 시 최초 데이터 로딩 — fetchData의 setState 호출은 fetch 이후(비동기)에만 일어난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(false);
  }, [fetchData]);

  const handleRefresh = () => {
    setState({ status: "loading" });
    fetchData(true);
  };

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur p-5 shadow-sm flex flex-col gap-4 min-h-[240px]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span aria-hidden>{topic.emoji}</span>
          {topic.label}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={state.status === "loading"}
          className="text-xs rounded-full border border-black/10 dark:border-white/15 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          {state.status === "loading" ? "새로고침 중…" : "↻ 새로고침"}
        </button>
      </div>

      {state.status === "loading" && (
        <div className="flex-1 flex flex-col gap-2 animate-pulse">
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-full" />
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-5/6" />
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-2/3" />
        </div>
      )}

      {state.status === "error" && (
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex-1 flex flex-col gap-3">
          <p className="text-sm leading-relaxed whitespace-pre-line">{state.data.summary}</p>

          {state.data.warning && (
            <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {state.data.warning}</p>
          )}

          <ul className="text-xs text-black/60 dark:text-white/60 flex flex-col gap-1">
            {state.data.items
              .filter((item) => item.verified)
              .map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted hover:text-black dark:hover:text-white"
                  >
                    {item.title}
                  </a>
                  <span className="ml-1">({item.date})</span>
                </li>
              ))}
          </ul>

          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-[11px] text-black/40 dark:text-white/40">
              업데이트: {new Date(state.data.generatedAt).toLocaleTimeString("ko-KR")}
            </span>
            <SpeakButton text={state.data.summary} />
          </div>
        </div>
      )}
    </div>
  );
}
