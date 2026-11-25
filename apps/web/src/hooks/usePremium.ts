import { useQuery } from "@tanstack/react-query";
import { site, usablePremium } from "@/data/site";

async function fetchPremium() {
  const response = await fetch("/api/v1/premium");
  if (!response.ok) throw new Error("premium unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usablePremium(line) ? line : site.premium;
}

export function usePremium() {
  const query = useQuery({
    queryKey: ["premium"],
    queryFn: fetchPremium,
    placeholderData: site.premium,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.premium;
  return usablePremium(line) ? line : site.premium;
}
