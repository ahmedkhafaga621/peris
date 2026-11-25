import { useQuery } from "@tanstack/react-query";
import { site, usableSearchPieces } from "@/data/site";

async function fetchSearchPieces() {
  const response = await fetch("/api/v1/searchpieces");
  if (!response.ok) throw new Error("search pieces unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSearchPieces(line) ? line : site.searchPieces;
}

export function useSearchPieces() {
  const query = useQuery({
    queryKey: ["searchpieces"],
    queryFn: fetchSearchPieces,
    placeholderData: site.searchPieces,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.searchPieces;
  return usableSearchPieces(line) ? line : site.searchPieces;
}
