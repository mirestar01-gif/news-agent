import topicsData from "@/config/topics.json";

export type Topic = {
  id: string;
  label: string;
  emoji: string;
  searchQuery: string;
  enabled: boolean;
};

export function getTopics(): Topic[] {
  return (topicsData as Topic[]).filter((t) => t.enabled !== false);
}

export function getTopicById(id: string): Topic | undefined {
  return (topicsData as Topic[]).find((t) => t.id === id);
}
