import { useQuery } from "@tanstack/react-query";
import { site, usableFooterSupport } from "@/data/site";

async function fetchFooterSupport() {
  const response = await fetch("/api/v1/footsupport");
  if (!response.ok) throw new Error("footsupport unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterSupport(line) ? line : site.footerSupport;
}

export function useFooterSupport() {
  const query = useQuery({
    queryKey: ["footsupport"],
    queryFn: fetchFooterSupport,
    placeholderData: site.footerSupport,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerSupport;
  return usableFooterSupport(line) ? line : site.footerSupport;
}
