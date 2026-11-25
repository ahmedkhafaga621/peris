import { useQuery } from "@tanstack/react-query";
import { site, usableCheckoutPrefill } from "@/data/site";

async function fetchCheckoutPrefill() {
  const response = await fetch("/api/v1/checkoutprefill");
  if (!response.ok) throw new Error("checkout prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCheckoutPrefill(line) ? line : site.checkoutPrefill;
}

export function useCheckoutPrefill() {
  const query = useQuery({
    queryKey: ["checkoutprefill"],
    queryFn: fetchCheckoutPrefill,
    placeholderData: site.checkoutPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.checkoutPrefill;
  return usableCheckoutPrefill(line) ? line : site.checkoutPrefill;
}
