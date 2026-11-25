import { useQuery } from "@tanstack/react-query";
import { site, usableReadStory } from "@/data/site";

async function fetchReadStory() {
  const response = await fetch("/api/v1/readstory");
  if (!response.ok) throw new Error("readstory unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableReadStory(line) ? line : site.readStory;
}

export function useReadStory() {
  const query = useQuery({
    queryKey: ["readstory"],
    queryFn: fetchReadStory,
    placeholderData: site.readStory,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.readStory;
  return usableReadStory(line) ? line : site.readStory;
}
