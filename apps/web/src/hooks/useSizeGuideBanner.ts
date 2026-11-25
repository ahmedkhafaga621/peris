import { useQuery } from "@tanstack/react-query";
import { site, usableSizeGuideBanner } from "@/data/site";

async function fetchSizeGuideBanner() {
  const response = await fetch("/api/v1/sizeguidebanner");
  if (!response.ok) throw new Error("size guide banner unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSizeGuideBanner(line) ? line : site.sizeGuideBanner;
}

export function useSizeGuideBanner() {
  const query = useQuery({
    queryKey: ["sizeguidebanner"],
    queryFn: fetchSizeGuideBanner,
    placeholderData: site.sizeGuideBanner,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.sizeGuideBanner;
  return usableSizeGuideBanner(line) ? line : site.sizeGuideBanner;
}
