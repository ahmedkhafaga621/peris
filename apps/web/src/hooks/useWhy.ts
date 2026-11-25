import { useQuery } from "@tanstack/react-query";
import { site, usableWhy } from "@/data/site";

async function fetchWhy() {
  const response = await fetch("/api/v1/why");
  if (!response.ok) throw new Error("why unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableWhy(line) ? line : site.why;
}

export function useWhy() {
  const query = useQuery({
    queryKey: ["why"],
    queryFn: fetchWhy,
    placeholderData: site.why,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.why;
  return usableWhy(line) ? line : site.why;
}
