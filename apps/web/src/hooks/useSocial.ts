import { useQuery } from "@tanstack/react-query";
import { site, usableSocial } from "@/data/site";

async function fetchSocial() {
  const response = await fetch("/api/v1/social");
  if (!response.ok) throw new Error("social unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSocial(line) ? line : site.social;
}

export function useSocial() {
  const query = useQuery({
    queryKey: ["social"],
    queryFn: fetchSocial,
    placeholderData: site.social,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.social;
  return usableSocial(line) ? line : site.social;
}
