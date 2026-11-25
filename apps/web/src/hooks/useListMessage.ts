import { useQuery } from "@tanstack/react-query";
import { site, usableListMessage } from "@/data/site";

async function fetchListMessage() {
  const response = await fetch("/api/v1/listmsg");
  if (!response.ok) throw new Error("listmsg unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableListMessage(line) ? line : site.listMessage;
}

export function useListMessage() {
  const query = useQuery({
    queryKey: ["listmsg"],
    queryFn: fetchListMessage,
    placeholderData: site.listMessage,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.listMessage;
  return usableListMessage(line) ? line : site.listMessage;
}
