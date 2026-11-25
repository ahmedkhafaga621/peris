import { useQuery } from "@tanstack/react-query";
import { site, usableStoryAlt } from "@/data/site";

async function fetchStoryAlt() {
  const response = await fetch("/api/v1/storyalt");
  if (!response.ok) throw new Error("story alt unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableStoryAlt(line) ? line : site.storyAlt;
}

export function useStoryAlt() {
  const query = useQuery({
    queryKey: ["storyalt"],
    queryFn: fetchStoryAlt,
    placeholderData: site.storyAlt,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.storyAlt;
  return usableStoryAlt(line) ? line : site.storyAlt;
}
