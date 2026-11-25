import { useQuery } from "@tanstack/react-query";
import { site, usableSellers } from "@/data/site";

async function fetchSellers() {
  const response = await fetch("/api/v1/sellers");
  if (!response.ok) throw new Error("sellers unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSellers(line) ? line : site.sellers;
}

export function useSellers() {
  const query = useQuery({
    queryKey: ["sellers"],
    queryFn: fetchSellers,
    placeholderData: site.sellers,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.sellers;
  return usableSellers(line) ? line : site.sellers;
}
