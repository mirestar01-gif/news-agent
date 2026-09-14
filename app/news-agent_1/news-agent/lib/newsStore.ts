import { Redis } from "@upstash/redis";
import type { TopicResult } from "./newsAgent";

// 크론(매일 아침 사전 생성)과 대시보드(방문 시 조회)는 서로 다른 서버리스 함수라
// 메모리를 공유하지 않습니다. 그래서 Upstash Redis(무료 플랜 가능)에 결과를 저장해두고
// 두 함수가 같은 값을 읽도록 합니다. 환경 변수가 없으면 이 저장소는 조용히 비활성화되고,
// 기존처럼 방문 시 즉석 생성 방식으로만 동작합니다.

const FRESH_MS = 20 * 60 * 60 * 1000; // 20시간 이내 결과만 "신선함"으로 간주

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export function isPersistentStoreConfigured(): boolean {
  return getRedis() !== null;
}

function key(topicId: string) {
  return `news-agent:topic:${topicId}`;
}

/** 저장된 결과가 있고 아직 신선하면 반환, 없거나 오래됐으면 null. */
export async function getFreshTopicResult(topicId: string): Promise<TopicResult | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const data = await client.get<TopicResult>(key(topicId));
    if (!data) return null;
    const age = Date.now() - new Date(data.generatedAt).getTime();
    return age <= FRESH_MS ? data : null;
  } catch (err) {
    console.error("[news-agent] Redis 조회 실패:", err);
    return null;
  }
}

/** 최신 여부와 무관하게 저장된 마지막 결과 (모두 실패했을 때의 최후 대비용). */
export async function getLastTopicResult(topicId: string): Promise<TopicResult | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get<TopicResult>(key(topicId));
  } catch (err) {
    console.error("[news-agent] Redis 조회 실패:", err);
    return null;
  }
}

export async function saveTopicResult(topicId: string, data: TopicResult): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    // 하루 이상 지난 값은 자동 만료 (26시간)
    await client.set(key(topicId), data, { ex: 26 * 60 * 60 });
  } catch (err) {
    console.error("[news-agent] Redis 저장 실패:", err);
  }
}
