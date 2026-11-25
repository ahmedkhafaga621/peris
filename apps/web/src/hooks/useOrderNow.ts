import { useQuery } from "@tanstack/react-query";
import { site, usableOrderNow } from "@/data/site";

async function fetchOrderNow() {
  const response = await fetch("/api/v1/ordernow");
  if (!response.ok) throw new Error("order now unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableOrderNow(line) ? line : site.orderNow;
}

export function useOrderNow() {
  const query = useQuery({
    queryKey: ["ordernow"],
    queryFn: fetchOrderNow,
    placeholderData: site.orderNow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.orderNow;
  return usableOrderNow(line) ? line : site.orderNow;
}
