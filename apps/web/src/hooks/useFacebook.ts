import { useQuery } from "@tanstack/react-query";
import { site, usableFacebook } from "@/data/site";

async function fetchFacebook() {
  const response = await fetch("/api/v1/facebook");
  if (!response.ok) throw new Error("facebook unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFacebook(line) ? line : site.facebook;
}

export function useFacebook() {
  const query = useQuery({
    queryKey: ["facebook"],
    queryFn: fetchFacebook,
    placeholderData: site.facebook,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.facebook;
  return usableFacebook(line) ? line : site.facebook;
}
