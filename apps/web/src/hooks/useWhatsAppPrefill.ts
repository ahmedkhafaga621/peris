import { useQuery } from "@tanstack/react-query";
import { site, usableWhatsAppPrefill } from "@/data/site";

async function fetchWhatsAppPrefill() {
  const response = await fetch("/api/v1/whatsappprefill");
  if (!response.ok) throw new Error("WhatsApp prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableWhatsAppPrefill(line) ? line : site.whatsAppPrefill;
}

export function useWhatsAppPrefill() {
  const query = useQuery({
    queryKey: ["whatsappprefill"],
    queryFn: fetchWhatsAppPrefill,
    placeholderData: site.whatsAppPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.whatsAppPrefill;
  return usableWhatsAppPrefill(line) ? line : site.whatsAppPrefill;
}
