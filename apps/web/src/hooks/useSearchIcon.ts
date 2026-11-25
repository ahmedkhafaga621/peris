import { useQuery } from "@tanstack/react-query";
import { site, usableSearchIcon } from "@/data/site";

async function fetchSearchIcon() {
  const response = await fetch("/api/v1/searchicon");
  if (!response.ok) throw new Error("search icon unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSearchIcon(line) ? line : site.searchIcon;
}

export function useSearchIcon() {
  const query = useQuery({
    queryKey: ["searchicon"],
    queryFn: fetchSearchIcon,
    placeholderData: site.searchIcon,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.searchIcon;
  return usableSearchIcon(line) ? line : site.searchIcon;
}
