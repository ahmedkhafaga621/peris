import { useQuery } from "@tanstack/react-query";
import { site, usableCraftsmanship } from "@/data/site";

async function fetchCraftsmanship() {
  const response = await fetch("/api/v1/craftsmanship");
  if (!response.ok) throw new Error("craftsmanship unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCraftsmanship(line) ? line : site.craftsmanship;
}

export function useCraftsmanship() {
  const query = useQuery({
    queryKey: ["craftsmanship"],
    queryFn: fetchCraftsmanship,
    placeholderData: site.craftsmanship,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.craftsmanship;
  return usableCraftsmanship(line) ? line : site.craftsmanship;
}
