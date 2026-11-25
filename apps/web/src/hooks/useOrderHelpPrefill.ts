import { useQuery } from "@tanstack/react-query";
import { site, usableOrderHelpPrefill } from "@/data/site";

async function fetchOrderHelpPrefill() {
  const response = await fetch("/api/v1/orderhelpprefill");
  if (!response.ok) throw new Error("order help prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableOrderHelpPrefill(line) ? line : site.orderHelpPrefill;
}

export function useOrderHelpPrefill() {
  const query = useQuery({
    queryKey: ["orderhelpprefill"],
    queryFn: fetchOrderHelpPrefill,
    placeholderData: site.orderHelpPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.orderHelpPrefill;
  return usableOrderHelpPrefill(line) ? line : site.orderHelpPrefill;
}
