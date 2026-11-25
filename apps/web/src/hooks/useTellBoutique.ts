import { useQuery } from "@tanstack/react-query";
import { site, usableTellBoutique } from "@/data/site";

async function fetchTellBoutique() {
  const response = await fetch("/api/v1/tellboutique");
  if (!response.ok) throw new Error("tell boutique label unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableTellBoutique(line) ? line : site.tellBoutique;
}

export function useTellBoutique() {
  const query = useQuery({
    queryKey: ["tellboutique"],
    queryFn: fetchTellBoutique,
    placeholderData: site.tellBoutique,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.tellBoutique;
  return usableTellBoutique(line) ? line : site.tellBoutique;
}
