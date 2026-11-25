import { useQuery } from "@tanstack/react-query";
import { site, usableSubscribeButton } from "@/data/site";

async function fetchSubscribeButton() {
  const response = await fetch("/api/v1/subscribebtn");
  if (!response.ok) throw new Error("subscribebtn unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSubscribeButton(line) ? line : site.subscribeButton;
}

export function useSubscribeButton() {
  const query = useQuery({
    queryKey: ["subscribebtn"],
    queryFn: fetchSubscribeButton,
    placeholderData: site.subscribeButton,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.subscribeButton;
  return usableSubscribeButton(line) ? line : site.subscribeButton;
}
