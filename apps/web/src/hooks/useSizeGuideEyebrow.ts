import { useQuery } from "@tanstack/react-query";
import { site, usableSizeGuideEyebrow } from "@/data/site";

async function fetchSizeGuideEyebrow() {
  const response = await fetch("/api/v1/sizeguideeyebrow");
  if (!response.ok) throw new Error("size guide eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSizeGuideEyebrow(line) ? line : site.sizeGuideEyebrow;
}

export function useSizeGuideEyebrow() {
  const query = useQuery({
    queryKey: ["sizeguideeyebrow"],
    queryFn: fetchSizeGuideEyebrow,
    placeholderData: site.sizeGuideEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.sizeGuideEyebrow;
  return usableSizeGuideEyebrow(line) ? line : site.sizeGuideEyebrow;
}
