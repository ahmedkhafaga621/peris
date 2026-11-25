import { useQuery } from "@tanstack/react-query";
import { site, usableHem } from "@/data/site";

async function fetchHem() {
  const response = await fetch("/api/v1/hem");
  if (!response.ok) throw new Error("hem unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableHem(line) ? line : site.hem;
}

export function useHem() {
  const query = useQuery({
    queryKey: ["hem"],
    queryFn: fetchHem,
    placeholderData: site.hem,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.hem;
  return usableHem(line) ? line : site.hem;
}
