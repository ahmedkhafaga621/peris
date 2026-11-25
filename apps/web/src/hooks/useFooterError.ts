import { useQuery } from "@tanstack/react-query";
import { site, usableFooterError } from "@/data/site";

async function fetchFooterError() {
  const response = await fetch("/api/v1/footerr");
  if (!response.ok) throw new Error("footerr unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterError(line) ? line : site.footerError;
}

export function useFooterError() {
  const query = useQuery({
    queryKey: ["footerr"],
    queryFn: fetchFooterError,
    placeholderData: site.footerError,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerError;
  return usableFooterError(line) ? line : site.footerError;
}
