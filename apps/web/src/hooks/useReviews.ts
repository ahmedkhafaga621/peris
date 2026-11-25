import { useQuery } from "@tanstack/react-query";

export type HouseReview = {
  id: string;
  body: string;
  rating: number;
  name: string;
  productName: string;
  productSlug: string;
};

async function fetchReviews(): Promise<HouseReview[]> {
  const response = await fetch("/api/v1/reviews");
  if (!response.ok) throw new Error("reviews unavailable");
  const body = (await response.json()) as { reviews: HouseReview[] };
  return body.reviews;
}

export function useReviews() {
  const query = useQuery({
    queryKey: ["reviews"],
    queryFn: fetchReviews,
    placeholderData: [],
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data ?? [];
}
