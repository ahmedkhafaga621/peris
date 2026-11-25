import { useQuery } from "@tanstack/react-query";
import { site, usableCheckoutEyebrow } from "@/data/site";

async function fetchCheckoutEyebrow() {
  const response = await fetch("/api/v1/checkouteyebrow");
  if (!response.ok) throw new Error("checkout eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCheckoutEyebrow(line) ? line : site.checkoutEyebrow;
}

export function useCheckoutEyebrow() {
  const query = useQuery({
    queryKey: ["checkouteyebrow"],
    queryFn: fetchCheckoutEyebrow,
    placeholderData: site.checkoutEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.checkoutEyebrow;
  return usableCheckoutEyebrow(line) ? line : site.checkoutEyebrow;
}
