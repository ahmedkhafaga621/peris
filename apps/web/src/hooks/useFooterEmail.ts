import { useQuery } from "@tanstack/react-query";
import { site, usableFooterEmail } from "@/data/site";

async function fetchFooterEmail() {
  const response = await fetch("/api/v1/footemail");
  if (!response.ok) throw new Error("footemail unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterEmail(line) ? line : site.footerEmail;
}

export function useFooterEmail() {
  const query = useQuery({
    queryKey: ["footemail"],
    queryFn: fetchFooterEmail,
    placeholderData: site.footerEmail,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerEmail;
  return usableFooterEmail(line) ? line : site.footerEmail;
}
