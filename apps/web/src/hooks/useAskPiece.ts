import { useQuery } from "@tanstack/react-query";
import { site, usableAskPiece } from "@/data/site";

async function fetchAskPiece() {
  const response = await fetch("/api/v1/askpiece");
  if (!response.ok) throw new Error("ask piece label unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableAskPiece(line) ? line : site.askPiece;
}

export function useAskPiece() {
  const query = useQuery({
    queryKey: ["askpiece"],
    queryFn: fetchAskPiece,
    placeholderData: site.askPiece,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.askPiece;
  return usableAskPiece(line) ? line : site.askPiece;
}
