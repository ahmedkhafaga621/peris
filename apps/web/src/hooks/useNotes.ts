import { useQuery } from "@tanstack/react-query";
import { site, usableNotes } from "@/data/site";

async function fetchNotes() {
  const response = await fetch("/api/v1/notes");
  if (!response.ok) throw new Error("notes unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableNotes(line) ? line : site.notes;
}

export function useNotes() {
  const query = useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
    placeholderData: site.notes,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.notes;
  return usableNotes(line) ? line : site.notes;
}
