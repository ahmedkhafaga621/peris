import { useQuery } from "@tanstack/react-query";
import { site, usableInstagramLink } from "@/data/site";

async function fetchInstagramLink() {
  const response = await fetch("/api/v1/instagramlink");
  if (!response.ok) throw new Error("instagramlink unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableInstagramLink(line) ? line : site.instagramLink;
}

export function useInstagramLink() {
  const query = useQuery({
    queryKey: ["instagramlink"],
    queryFn: fetchInstagramLink,
    placeholderData: site.instagramLink,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.instagramLink;
  return usableInstagramLink(line) ? line : site.instagramLink;
}
