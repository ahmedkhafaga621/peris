import { useQuery } from "@tanstack/react-query";
import { site, usableWishlistEyebrow } from "@/data/site";

async function fetchWishlistEyebrow() {
  const response = await fetch("/api/v1/wishlisteyebrow");
  if (!response.ok) throw new Error("wishlist eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableWishlistEyebrow(line) ? line : site.wishlistEyebrow;
}

export function useWishlistEyebrow() {
  const query = useQuery({
    queryKey: ["wishlisteyebrow"],
    queryFn: fetchWishlistEyebrow,
    placeholderData: site.wishlistEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.wishlistEyebrow;
  return usableWishlistEyebrow(line) ? line : site.wishlistEyebrow;
}
