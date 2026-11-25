import { useQuery } from "@tanstack/react-query";
import { site, usableSearchSubmit } from "@/data/site";

async function fetchSearchSubmit() {
  const response = await fetch("/api/v1/searchsubmit");
  if (!response.ok) throw new Error("search submit unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSearchSubmit(line) ? line : site.searchSubmit;
}

export function useSearchSubmit() {
  const query = useQuery({
    queryKey: ["searchsubmit"],
    queryFn: fetchSearchSubmit,
    placeholderData: site.searchSubmit,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.searchSubmit;
  return usableSearchSubmit(line) ? line : site.searchSubmit;
}
