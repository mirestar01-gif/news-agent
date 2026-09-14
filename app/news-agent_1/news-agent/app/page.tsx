import Dashboard from "@/components/Dashboard";
import { getTopics } from "@/lib/topics";

export default function Home() {
  const topics = getTopics();
  return <Dashboard topics={topics} />;
}
