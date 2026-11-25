import { useQuery } from "@tanstack/react-query";
import { site, usableSkuLabel } from "@/data/site";

async function fetchSkuLabel() {
  const response = await fetch("/api/v1/skulabel");
  if (!response.ok) throw new Error("SKU label unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSkuLabel(line) ? line : site.skuLabel;
}

export function useSkuLabel() {
  const query = useQuery({
    queryKey: ["skulabel"],
    queryFn: fetchSkuLabel,
    placeholderData: site.skuLabel,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.skuLabel;
  return usableSkuLabel(line) ? line : site.skuLabel;
}
