import { useQuery } from "@tanstack/react-query";
import { site, usableDebut } from "@/data/site";

async function fetchDebut() {
  const response = await fetch("/api/v1/debut");
  if (!response.ok) throw new Error("debut unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableDebut(line) ? line : site.debut;
}

export function useDebut() {
  const query = useQuery({
    queryKey: ["debut"],
    queryFn: fetchDebut,
    placeholderData: site.debut,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.debut;
  return usableDebut(line) ? line : site.debut;
}
