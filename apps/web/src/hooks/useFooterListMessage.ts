import { useQuery } from "@tanstack/react-query";
import { site, usableFooterListMessage } from "@/data/site";

async function fetchFooterListMessage() {
  const response = await fetch("/api/v1/footlist");
  if (!response.ok) throw new Error("footlist unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFooterListMessage(line) ? line : site.footerListMessage;
}

export function useFooterListMessage() {
  const query = useQuery({
    queryKey: ["footlist"],
    queryFn: fetchFooterListMessage,
    placeholderData: site.footerListMessage,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.footerListMessage;
  return usableFooterListMessage(line) ? line : site.footerListMessage;
}
