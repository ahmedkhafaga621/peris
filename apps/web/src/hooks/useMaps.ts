import { useQuery } from "@tanstack/react-query";
import { site, usableMaps } from "@/data/site";

async function fetchMaps() {
  const response = await fetch("/api/v1/maps");
  if (!response.ok) throw new Error("maps unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableMaps(line) ? line : site.maps;
}

export function useMaps() {
  const query = useQuery({
    queryKey: ["maps"],
    queryFn: fetchMaps,
    placeholderData: site.maps,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.maps;
  return usableMaps(line) ? line : site.maps;
}
