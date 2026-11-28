import { useQuery } from "@tanstack/react-query";
import { products as houseProducts, type Product } from "@/data/catalog";

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/v1/products");
  if (!response.ok) throw new Error("catalog unavailable");
  const body = (await response.json()) as { products: Product[] };
  return body.products.map((product) => ({
    ...product,
    compareAtFils: product.compareAtFils ?? undefined,
  }));
}

export function useProductsQuery() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    retry: 1,
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

export function useProducts() {
  const query = useProductsQuery();
  if (query.data) return query.data;
  if (query.isError) return houseProducts;
  return [];
}
