import { useQuery } from "@tanstack/react-query";
import { site, usableBespokePrefill } from "@/data/site";

async function fetchBespokePrefill() {
  const response = await fetch("/api/v1/bespokeprefill");
  if (!response.ok) throw new Error("bespoke prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableBespokePrefill(line) ? line : site.bespokePrefill;
}

export function useBespokePrefill() {
  const query = useQuery({
    queryKey: ["bespokeprefill"],
    queryFn: fetchBespokePrefill,
    placeholderData: site.bespokePrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.bespokePrefill;
  return usableBespokePrefill(line) ? line : site.bespokePrefill;
}
