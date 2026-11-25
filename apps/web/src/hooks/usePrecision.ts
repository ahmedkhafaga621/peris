import { useQuery } from "@tanstack/react-query";
import { site, usablePrecision } from "@/data/site";

async function fetchPrecision() {
  const response = await fetch("/api/v1/precision");
  if (!response.ok) throw new Error("precision unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usablePrecision(line) ? line : site.precision;
}

export function usePrecision() {
  const query = useQuery({
    queryKey: ["precision"],
    queryFn: fetchPrecision,
    placeholderData: site.precision,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.precision;
  return usablePrecision(line) ? line : site.precision;
}
