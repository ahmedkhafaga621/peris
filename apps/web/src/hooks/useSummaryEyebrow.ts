import { useQuery } from "@tanstack/react-query";
import { site, usableSummaryEyebrow } from "@/data/site";

async function fetchSummaryEyebrow() {
  const response = await fetch("/api/v1/summaryeyebrow");
  if (!response.ok) throw new Error("summary eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSummaryEyebrow(line) ? line : site.summaryEyebrow;
}

export function useSummaryEyebrow() {
  const query = useQuery({
    queryKey: ["summaryeyebrow"],
    queryFn: fetchSummaryEyebrow,
    placeholderData: site.summaryEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.summaryEyebrow;
  return usableSummaryEyebrow(line) ? line : site.summaryEyebrow;
}
