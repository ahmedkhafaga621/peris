import { useQuery } from "@tanstack/react-query";
import { collections } from "@/data/catalog";

export type HouseCollection = {
  slug: string;
  name: string;
  description: string;
  image?: string;
  position?: string;
};

/** Image positions only — not a product catalog fallback. */
const collectionVisuals = new Map<string, { image: string; position: string }>(
  collections.map((collection) => [
    collection.slug,
    { image: collection.image, position: collection.position },
  ]),
);

async function fetchCategories(): Promise<HouseCollection[]> {
  const response = await fetch("/api/v1/categories");
  if (!response.ok) throw new Error("collections unavailable");
  const body = (await response.json()) as {
    categories: { slug: string; name: string; description: string }[];
  };
  return body.categories.map((category) => {
    const visual = collectionVisuals.get(category.slug);
    return {
      slug: category.slug,
      name: category.name,
      description: category.description,
      image: visual?.image,
      position: visual?.position,
    };
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCategories() {
  const query = useCategoriesQuery();
  return query.data ?? [];
}
