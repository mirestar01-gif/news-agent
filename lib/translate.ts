/**
 * 1순위: 구글 번역이 실제 웹페이지 번역에 쓰는 비공식 무료 엔드포인트.
 *        키 불필요, 매우 관대한 요청 한도 — 수많은 오픈소스 번역 도구가 이 방식을 사용합니다.
 * 2순위(장애 시 대체): MyMemory 공개 API — 역시 무료, 키 불필요.
 * 둘 다 유료 서비스가 아니므로 비용은 계속 0원입니다.
 */
export async function translateToKorean(text: string): Promise<string> {
  if (!text) return text;

  const viaGoogle = await translateWithGoogleGtx(text);
  if (viaGoogle) return viaGoogle;

  const viaMyMemory = await translateWithMyMemory(text);
  if (viaMyMemory) return viaMyMemory;

  return text;
}

async function translateWithGoogleGtx(text: string): Promise<string | null> {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (news-research-agent)" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // 응답 형태: [[["번역문","원문",null,null,1], ...], null, "en"]
    const segments = data?.[0];
    if (!Array.isArray(segments)) return null;
    const translated = segments.map((seg: unknown[]) => seg?.[0] ?? "").join("");
    return translated.length > 0 ? translated : null;
  } catch {
    return null;
  }
}

async function translateWithMyMemory(text: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=en|ko`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (typeof translated !== "string" || translated.length === 0) return null;
    if (translated.toUpperCase().includes("MYMEMORY WARNING")) return null;
    return translated;
  } catch {
    return null;
  }
}
