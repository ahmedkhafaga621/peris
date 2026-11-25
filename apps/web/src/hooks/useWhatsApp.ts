import { useQuery } from "@tanstack/react-query";
import { site } from "@/data/site";

async function fetchWhatsApp() {
  const response = await fetch("/api/v1/storefront-settings");
  if (!response.ok) throw new Error("WhatsApp number unavailable");
  const body = (await response.json()) as {
    settings?: { whatsapp?: unknown };
  };
  const line =
    typeof body.settings?.whatsapp === "string"
      ? body.settings.whatsapp.trim()
      : "";
  const digits = line.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? line : site.whatsapp;
}

export function useWhatsApp() {
  const query = useQuery({
    queryKey: ["whatsapp"],
    queryFn: fetchWhatsApp,
    placeholderData: site.whatsapp,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data ?? site.whatsapp;
}
