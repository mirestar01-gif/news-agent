import type { Metadata } from "next";
import "./globals.css";

// Google Fonts는 빌드 환경에 따라 네트워크 접근이 막힐 수 있어(next/font/google) 사용하지 않고,
// 한글 표시에도 유리한 OS 기본 폰트 스택을 globals.css에서 사용합니다.

export const metadata: Metadata = {
  title: "오늘의 뉴스 브리핑",
  description: "매일 아침 검색·검증·요약된 개인용 뉴스 리서치 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
