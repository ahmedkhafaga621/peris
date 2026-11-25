import { useQuery } from "@tanstack/react-query";
import { site, usableBespokeSendPrefill } from "@/data/site";

async function fetchBespokeSendPrefill() {
  const response = await fetch("/api/v1/bespokesendprefill");
  if (!response.ok) throw new Error("bespoke send prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableBespokeSendPrefill(line) ? line : site.bespokeSendPrefill;
}

export function useBespokeSendPrefill() {
  const query = useQuery({
    queryKey: ["bespokesendprefill"],
    queryFn: fetchBespokeSendPrefill,
    placeholderData: site.bespokeSendPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.bespokeSendPrefill;
  return usableBespokeSendPrefill(line) ? line : site.bespokeSendPrefill;
}
