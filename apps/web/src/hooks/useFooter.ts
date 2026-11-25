import { useQuery } from "@tanstack/react-query";
import { site, usableFooter } from "@/data/site";

async function fetchFooter() {
  const response = await fetch("/api/v1/footer");
  if (!response.ok) throw new Error("footer unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooter(line) ? line : site.footer;
}

export function useFooter() {
  const query = useQuery({
    queryKey: ["footer"],
    queryFn: fetchFooter,
    placeholderData: site.footer,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footer;
  return usableFooter(line) ? line : site.footer;
}
