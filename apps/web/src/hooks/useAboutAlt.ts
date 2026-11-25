import { useQuery } from "@tanstack/react-query";
import { site, usableAboutAlt } from "@/data/site";

async function fetchAboutAlt() {
  const response = await fetch("/api/v1/aboutalt");
  if (!response.ok) throw new Error("about alt unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableAboutAlt(line) ? line : site.aboutAlt;
}

export function useAboutAlt() {
  const query = useQuery({
    queryKey: ["aboutalt"],
    queryFn: fetchAboutAlt,
    placeholderData: site.aboutAlt,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.aboutAlt;
  return usableAboutAlt(line) ? line : site.aboutAlt;
}
