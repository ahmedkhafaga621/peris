import { useQuery } from "@tanstack/react-query";
import { site, usablePieces } from "@/data/site";

async function fetchPieces() {
  const response = await fetch("/api/v1/pieces");
  if (!response.ok) throw new Error("pieces unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usablePieces(line) ? line : site.pieces;
}

export function usePieces() {
  const query = useQuery({
    queryKey: ["pieces"],
    queryFn: fetchPieces,
    placeholderData: site.pieces,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.pieces;
  return usablePieces(line) ? line : site.pieces;
}
