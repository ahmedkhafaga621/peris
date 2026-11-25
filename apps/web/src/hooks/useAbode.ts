import { useQuery } from "@tanstack/react-query";
import { site, usableAbode } from "@/data/site";

async function fetchAbode() {
  const response = await fetch("/api/v1/abode");
  if (!response.ok) throw new Error("abode unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableAbode(line) ? line : site.abode;
}

export function useAbode() {
  const query = useQuery({
    queryKey: ["abode"],
    queryFn: fetchAbode,
    placeholderData: site.abode,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.abode;
  return usableAbode(line) ? line : site.abode;
}
