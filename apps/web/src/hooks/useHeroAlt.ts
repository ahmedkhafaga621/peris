import { useQuery } from "@tanstack/react-query";
import { site, usableHeroAlt } from "@/data/site";

async function fetchHeroAlt() {
  const response = await fetch("/api/v1/heroalt");
  if (!response.ok) throw new Error("hero alt unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableHeroAlt(line) ? line : site.heroAlt;
}

export function useHeroAlt() {
  const query = useQuery({
    queryKey: ["heroalt"],
    queryFn: fetchHeroAlt,
    placeholderData: site.heroAlt,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.heroAlt;
  return usableHeroAlt(line) ? line : site.heroAlt;
}
