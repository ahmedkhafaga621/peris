import { useQuery } from "@tanstack/react-query";
import { site, usableFooterQuickLinks } from "@/data/site";

async function fetchFooterQuickLinks() {
  const response = await fetch("/api/v1/footquick");
  if (!response.ok) throw new Error("footquick unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterQuickLinks(line) ? line : site.footerQuickLinks;
}

export function useFooterQuickLinks() {
  const query = useQuery({
    queryKey: ["footquick"],
    queryFn: fetchFooterQuickLinks,
    placeholderData: site.footerQuickLinks,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerQuickLinks;
  return usableFooterQuickLinks(line) ? line : site.footerQuickLinks;
}
