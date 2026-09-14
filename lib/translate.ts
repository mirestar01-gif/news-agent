/**
 * MyMemory(mymemory.translated.net)는 키 없이 쓸 수 있는 무료 번역 API입니다.
 * 익명 사용 시 일일 문자 수 한도가 있지만, 개인용 헤드라인 번역 수준에서는
 * 충분히 무료 범위 안에서 사용할 수 있습니다. 실패 시 원문을 그대로 반환합니다.
 */
export async function translateToKorean(text: string): Promise<string> {
  if (!text) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=en|ko`;
    const res = await fetch(url, { next: { revalidate: 1800 } }); // 30분 캐시
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    return typeof translated === "string" && translated.length > 0
      ? translated
      : text;
  } catch {
    return text;
  }
}
