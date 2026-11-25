import { useQuery } from "@tanstack/react-query";
import { site, usableTrackEyebrow } from "@/data/site";

async function fetchTrackEyebrow() {
  const response = await fetch("/api/v1/trackeyebrow");
  if (!response.ok) throw new Error("track eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableTrackEyebrow(line) ? line : site.trackEyebrow;
}

export function useTrackEyebrow() {
  const query = useQuery({
    queryKey: ["trackeyebrow"],
    queryFn: fetchTrackEyebrow,
    placeholderData: site.trackEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.trackEyebrow;
  return usableTrackEyebrow(line) ? line : site.trackEyebrow;
}
