import { useQuery } from "@tanstack/react-query";
import { site, usableFooterNewsletter } from "@/data/site";

async function fetchFooterNewsletter() {
  const response = await fetch("/api/v1/footnews");
  if (!response.ok) throw new Error("footnews unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterNewsletter(line) ? line : site.footerNewsletter;
}

export function useFooterNewsletter() {
  const query = useQuery({
    queryKey: ["footnews"],
    queryFn: fetchFooterNewsletter,
    placeholderData: site.footerNewsletter,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerNewsletter;
  return usableFooterNewsletter(line) ? line : site.footerNewsletter;
}
