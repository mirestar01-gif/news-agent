"use client";

import type { Topic } from "@/lib/topics";
import TopicCard from "./TopicCard";

export default function Dashboard({ topics }: { topics: Topic[] }) {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 py-8 sm:px-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold">📰 오늘의 뉴스 브리핑</h1>
          <p className="text-sm text-black/50 dark:text-white/50">{today}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>

        <footer className="text-center text-xs text-black/40 dark:text-white/40 pt-4">
          검색 → 검증 → 요약 3단계 에이전트로 생성됩니다. 주제는 config/topics.json에서 관리하세요.
        </footer>
      </div>
    </main>
  );
}
