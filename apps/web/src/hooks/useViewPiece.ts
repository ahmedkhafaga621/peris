import { useQuery } from "@tanstack/react-query";
import { site, usableViewPiece } from "@/data/site";

async function fetchViewPiece() {
  const response = await fetch("/api/v1/viewpiece");
  if (!response.ok) throw new Error("viewpiece unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableViewPiece(line) ? line : site.viewPiece;
}

export function useViewPiece() {
  const query = useQuery({
    queryKey: ["viewpiece"],
    queryFn: fetchViewPiece,
    placeholderData: site.viewPiece,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.viewPiece;
  return usableViewPiece(line) ? line : site.viewPiece;
}
