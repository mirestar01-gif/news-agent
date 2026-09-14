export type FxRate = {
  base: string;
  target: string;
  rate: number;
  date: string;
};

/**
 * Frankfurter(frankfurter.dev)는 유럽중앙은행 데이터를 기반으로 한
 * 완전 무료, 키 불필요 환율 API입니다. 유료 플랜이 없어 비용 걱정이 없습니다.
 */
export async function fetchUsdKrw(): Promise<FxRate | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW",
      { next: { revalidate: 3600 } } // 1시간 캐시
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.KRW;
    if (!rate) return null;
    return { base: "USD", target: "KRW", rate, date: data.date };
  } catch {
    return null;
  }
}
