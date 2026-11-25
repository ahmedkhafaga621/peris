import { useQuery } from "@tanstack/react-query";
import { site, usableOrderPrefill } from "@/data/site";

async function fetchOrderPrefill() {
  const response = await fetch("/api/v1/orderprefill");
  if (!response.ok) throw new Error("order prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableOrderPrefill(line) ? line : site.orderPrefill;
}

export function useOrderPrefill() {
  const query = useQuery({
    queryKey: ["orderprefill"],
    queryFn: fetchOrderPrefill,
    placeholderData: site.orderPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.orderPrefill;
  return usableOrderPrefill(line) ? line : site.orderPrefill;
}
