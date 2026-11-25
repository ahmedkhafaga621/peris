import { useQuery } from "@tanstack/react-query";
import { aboutCopy, usableStory } from "@/data/site";

async function fetchStory() {
  const response = await fetch("/api/v1/story");
  if (!response.ok) throw new Error("story unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableStory(line) ? line : aboutCopy;
}

export function useStory() {
  const query = useQuery({
    queryKey: ["story"],
    queryFn: fetchStory,
    placeholderData: aboutCopy,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? aboutCopy;
  return usableStory(line) ? line : aboutCopy;
}
