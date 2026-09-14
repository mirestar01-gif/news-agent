export type FxRate = {
  base: string;
  target: string;
  rate: number;
  date: string;
};

/**
 * 1순위: 네이버 금융이 사용하는 공개 실시간 환율 데이터 (키 불필요, 장중 계속 갱신)
 * 2순위(장애 시 대체): Frankfurter API — 완전 무료, 키 불필요 (평일 1일 1회 갱신)
 * 둘 다 유료 API가 아니라 비용은 여전히 0원입니다.
 */
export async function fetchUsdKrw(): Promise<FxRate | null> {
  const naver = await fetchFromNaver();
  if (naver) return naver;
  return fetchFromFrankfurter();
}

async function fetchFromNaver(): Promise<FxRate | null> {
  try {
    const res = await fetch(
      "https://polling.finance.naver.com/api/realtime/domestic/exchange/FX_USDKRW",
      {
        headers: { "User-Agent": "Mozilla/5.0 (news-research-agent)" },
        next: { revalidate: 300 }, // 5분 캐시
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const row = data?.result?.datas?.[0];
    const priceRaw = row?.closePrice;
    if (!priceRaw) return null;

    const rate = Number(String(priceRaw).replace(/,/g, ""));
    if (!Number.isFinite(rate)) return null;

    const tradedAt: string | undefined = row?.localTradedAt;
    const date = tradedAt ? tradedAt.slice(0, 16).replace("T", " ") : "실시간";

    return { base: "USD", target: "KRW", rate, date };
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter(): Promise<FxRate | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.KRW;
    if (!rate) return null;
    return { base: "USD", target: "KRW", rate, date: `${data.date} (전일 종가)` };
  } catch {
    return null;
  }
}

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
