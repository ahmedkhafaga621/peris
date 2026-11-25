import { useQuery } from "@tanstack/react-query";
import { site, usableViewEdit } from "@/data/site";

async function fetchViewEdit() {
  const response = await fetch("/api/v1/viewedit");
  if (!response.ok) throw new Error("viewedit unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableViewEdit(line) ? line : site.viewEdit;
}

export function useViewEdit() {
  const query = useQuery({
    queryKey: ["viewedit"],
    queryFn: fetchViewEdit,
    placeholderData: site.viewEdit,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.viewEdit;
  return usableViewEdit(line) ? line : site.viewEdit;
}
