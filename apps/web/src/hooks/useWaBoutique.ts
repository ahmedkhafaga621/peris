import { useQuery } from "@tanstack/react-query";
import { site, usableWaBoutique } from "@/data/site";

async function fetchWaBoutique() {
  const response = await fetch("/api/v1/waboutique");
  if (!response.ok) throw new Error("WhatsApp the boutique unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableWaBoutique(line) ? line : site.waBoutique;
}

export function useWaBoutique() {
  const query = useQuery({
    queryKey: ["waboutique"],
    queryFn: fetchWaBoutique,
    placeholderData: site.waBoutique,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.waBoutique;
  return usableWaBoutique(line) ? line : site.waBoutique;
}
