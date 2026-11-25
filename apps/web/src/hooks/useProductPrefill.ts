import { useQuery } from "@tanstack/react-query";
import { site, usableProductPrefill } from "@/data/site";

async function fetchProductPrefill() {
  const response = await fetch("/api/v1/productprefill");
  if (!response.ok) throw new Error("product prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableProductPrefill(line) ? line : site.productPrefill;
}

export function useProductPrefill() {
  const query = useQuery({
    queryKey: ["productprefill"],
    queryFn: fetchProductPrefill,
    placeholderData: site.productPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.productPrefill;
  return usableProductPrefill(line) ? line : site.productPrefill;
}
