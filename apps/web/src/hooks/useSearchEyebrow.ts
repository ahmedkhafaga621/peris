import { useQuery } from "@tanstack/react-query";
import { site, usableSearchEyebrow } from "@/data/site";

async function fetchSearchEyebrow() {
  const response = await fetch("/api/v1/searcheyebrow");
  if (!response.ok) throw new Error("search eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSearchEyebrow(line) ? line : site.searchEyebrow;
}

export function useSearchEyebrow() {
  const query = useQuery({
    queryKey: ["searcheyebrow"],
    queryFn: fetchSearchEyebrow,
    placeholderData: site.searchEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.searchEyebrow;
  return usableSearchEyebrow(line) ? line : site.searchEyebrow;
}
