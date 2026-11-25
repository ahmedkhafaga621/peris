import { useQuery } from "@tanstack/react-query";
import { site, usableInstagram } from "@/data/site";

async function fetchInstagram() {
  const response = await fetch("/api/v1/instagram");
  if (!response.ok) throw new Error("instagram unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableInstagram(line) ? line : site.instagram;
}

export function useInstagram() {
  const query = useQuery({
    queryKey: ["instagram"],
    queryFn: fetchInstagram,
    placeholderData: site.instagram,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.instagram;
  return usableInstagram(line) ? line : site.instagram;
}
