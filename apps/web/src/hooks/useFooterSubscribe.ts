import { useQuery } from "@tanstack/react-query";
import { site, usableFooterSubscribe } from "@/data/site";

async function fetchFooterSubscribe() {
  const response = await fetch("/api/v1/footsub");
  if (!response.ok) throw new Error("footsub unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterSubscribe(line) ? line : site.footerSubscribe;
}

export function useFooterSubscribe() {
  const query = useQuery({
    queryKey: ["footsub"],
    queryFn: fetchFooterSubscribe,
    placeholderData: site.footerSubscribe,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerSubscribe;
  return usableFooterSubscribe(line) ? line : site.footerSubscribe;
}
