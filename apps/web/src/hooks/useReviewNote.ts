import { useQuery } from "@tanstack/react-query";
import { site, usableReviewNote } from "@/data/site";

async function fetchReviewNote() {
  const response = await fetch("/api/v1/reviewnote");
  if (!response.ok) throw new Error("reviewnote unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableReviewNote(line) ? line : site.reviewNote;
}

export function useReviewNote() {
  const query = useQuery({
    queryKey: ["reviewnote"],
    queryFn: fetchReviewNote,
    placeholderData: site.reviewNote,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.reviewNote;
  return usableReviewNote(line) ? line : site.reviewNote;
}
