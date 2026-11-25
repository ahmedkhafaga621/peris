import { useQuery } from "@tanstack/react-query";
import { site, usableChatCta } from "@/data/site";

async function fetchChatCta() {
  const response = await fetch("/api/v1/chatcta");
  if (!response.ok) throw new Error("chatcta unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableChatCta(line) ? line : site.chatCta;
}

export function useChatCta() {
  const query = useQuery({
    queryKey: ["chatcta"],
    queryFn: fetchChatCta,
    placeholderData: site.chatCta,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.chatCta;
  return usableChatCta(line) ? line : site.chatCta;
}
