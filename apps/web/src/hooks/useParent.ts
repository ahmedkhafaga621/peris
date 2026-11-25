import { useQuery } from "@tanstack/react-query";
import { site, usableParent } from "@/data/site";

async function fetchParent() {
  const response = await fetch("/api/v1/parent");
  if (!response.ok) throw new Error("parent unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableParent(line) ? line : site.parent;
}

export function useParent() {
  const query = useQuery({
    queryKey: ["parent"],
    queryFn: fetchParent,
    placeholderData: site.parent,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.parent;
  return usableParent(line) ? line : site.parent;
}
