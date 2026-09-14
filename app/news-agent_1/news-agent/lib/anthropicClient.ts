import Anthropic from "@anthropic-ai/sdk";

// 검색은 최신 정보를 가져와야 하므로 웹 검색 도구를 지원하는 모델을 사용합니다.
// 필요하면 .env.local 의 ANTHROPIC_MODEL 값으로 다른 모델을 지정할 수 있습니다.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

let client: Anthropic | null | undefined;

/** ANTHROPIC_API_KEY가 없으면 null을 반환합니다 (호출부에서 안내 메시지 처리). */
export function getAnthropicClient(): Anthropic | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new Anthropic({ apiKey }) : null;
  return client;
}
