import { useQuery } from "@tanstack/react-query";
import { site, usableCollect } from "@/data/site";

async function fetchCollect() {
  const response = await fetch("/api/v1/collect");
  if (!response.ok) throw new Error("collect unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCollect(line) ? line : site.collect;
}

export function useCollect() {
  const query = useQuery({
    queryKey: ["collect"],
    queryFn: fetchCollect,
    placeholderData: site.collect,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.collect;
  return usableCollect(line) ? line : site.collect;
}
