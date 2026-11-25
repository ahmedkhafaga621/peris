import { useQuery } from "@tanstack/react-query";
import { site, usableTailoring } from "@/data/site";

async function fetchTailoring() {
  const response = await fetch("/api/v1/tailoring");
  if (!response.ok) throw new Error("tailoring unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableTailoring(line) ? line : site.tailoring;
}

export function useTailoring() {
  const query = useQuery({
    queryKey: ["tailoring"],
    queryFn: fetchTailoring,
    placeholderData: site.tailoring,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.tailoring;
  return usableTailoring(line) ? line : site.tailoring;
}
