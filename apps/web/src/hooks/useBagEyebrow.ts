import { useQuery } from "@tanstack/react-query";
import { site, usableBagEyebrow } from "@/data/site";

async function fetchBagEyebrow() {
  const response = await fetch("/api/v1/bageyebrow");
  if (!response.ok) throw new Error("bag eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableBagEyebrow(line) ? line : site.bagEyebrow;
}

export function useBagEyebrow() {
  const query = useQuery({
    queryKey: ["bageyebrow"],
    queryFn: fetchBagEyebrow,
    placeholderData: site.bagEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.bagEyebrow;
  return usableBagEyebrow(line) ? line : site.bagEyebrow;
}
