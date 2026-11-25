import { useQuery } from "@tanstack/react-query";
import { site, usableWays } from "@/data/site";

async function fetchWays() {
  const response = await fetch("/api/v1/ways");
  if (!response.ok) throw new Error("ways unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableWays(line) ? line : site.ways;
}

export function useWays() {
  const query = useQuery({
    queryKey: ["ways"],
    queryFn: fetchWays,
    placeholderData: site.ways,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.ways;
  return usableWays(line) ? line : site.ways;
}
