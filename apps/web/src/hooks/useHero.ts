import { useQuery } from "@tanstack/react-query";
import { site, usableHero } from "@/data/site";

async function fetchHero() {
  const response = await fetch("/api/v1/hero");
  if (!response.ok) throw new Error("hero unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableHero(line) ? line : site.hero;
}

export function useHero() {
  const query = useQuery({
    queryKey: ["hero"],
    queryFn: fetchHero,
    placeholderData: site.hero,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.hero;
  return usableHero(line) ? line : site.hero;
}
