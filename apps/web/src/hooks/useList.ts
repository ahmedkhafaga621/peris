import { useQuery } from "@tanstack/react-query";
import { site, usableList } from "@/data/site";

async function fetchList() {
  const response = await fetch("/api/v1/list");
  if (!response.ok) throw new Error("list unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableList(line) ? line : site.list;
}

export function useList() {
  const query = useQuery({
    queryKey: ["list"],
    queryFn: fetchList,
    placeholderData: site.list,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.list;
  return usableList(line) ? line : site.list;
}
