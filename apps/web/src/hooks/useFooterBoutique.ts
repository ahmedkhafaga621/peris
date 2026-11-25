import { useQuery } from "@tanstack/react-query";
import { site, usableFooterBoutique } from "@/data/site";

async function fetchFooterBoutique() {
  const response = await fetch("/api/v1/footboutique");
  if (!response.ok) throw new Error("footboutique unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterBoutique(line) ? line : site.footerBoutique;
}

export function useFooterBoutique() {
  const query = useQuery({
    queryKey: ["footboutique"],
    queryFn: fetchFooterBoutique,
    placeholderData: site.footerBoutique,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerBoutique;
  return usableFooterBoutique(line) ? line : site.footerBoutique;
}
