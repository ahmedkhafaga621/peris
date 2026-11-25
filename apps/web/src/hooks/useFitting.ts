import { useQuery } from "@tanstack/react-query";
import { site, usableFitting } from "@/data/site";

async function fetchFitting() {
  const response = await fetch("/api/v1/fitting");
  if (!response.ok) throw new Error("fitting unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFitting(line) ? line : site.fitting;
}

export function useFitting() {
  const query = useQuery({
    queryKey: ["fitting"],
    queryFn: fetchFitting,
    placeholderData: site.fitting,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.fitting;
  return usableFitting(line) ? line : site.fitting;
}
