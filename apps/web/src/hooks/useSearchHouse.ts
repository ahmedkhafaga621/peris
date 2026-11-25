import { useQuery } from "@tanstack/react-query";
import { site, usableSearchHouse } from "@/data/site";

async function fetchSearchHouse() {
  const response = await fetch("/api/v1/searchhouse");
  if (!response.ok) throw new Error("search house unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSearchHouse(line) ? line : site.searchHouse;
}

export function useSearchHouse() {
  const query = useQuery({
    queryKey: ["searchhouse"],
    queryFn: fetchSearchHouse,
    placeholderData: site.searchHouse,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.searchHouse;
  return usableSearchHouse(line) ? line : site.searchHouse;
}
