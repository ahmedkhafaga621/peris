import { useQuery } from "@tanstack/react-query";
import { site, usableShopEyebrow } from "@/data/site";

async function fetchShopEyebrow() {
  const response = await fetch("/api/v1/shopeyebrow");
  if (!response.ok) throw new Error("shop eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableShopEyebrow(line) ? line : site.shopEyebrow;
}

export function useShopEyebrow() {
  const query = useQuery({
    queryKey: ["shopeyebrow"],
    queryFn: fetchShopEyebrow,
    placeholderData: site.shopEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.shopEyebrow;
  return usableShopEyebrow(line) ? line : site.shopEyebrow;
}
