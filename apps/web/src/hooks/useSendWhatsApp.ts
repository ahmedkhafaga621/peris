import { useQuery } from "@tanstack/react-query";
import { site, usableSendWhatsApp } from "@/data/site";

async function fetchSendWhatsApp() {
  const response = await fetch("/api/v1/sendwhatsapp");
  if (!response.ok) throw new Error("send on WhatsApp unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSendWhatsApp(line) ? line : site.sendWhatsApp;
}

export function useSendWhatsApp() {
  const query = useQuery({
    queryKey: ["sendwhatsapp"],
    queryFn: fetchSendWhatsApp,
    placeholderData: site.sendWhatsApp,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.sendWhatsApp;
  return usableSendWhatsApp(line) ? line : site.sendWhatsApp;
}
