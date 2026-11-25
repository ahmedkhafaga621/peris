import { useQuery } from "@tanstack/react-query";
import { site } from "@/data/site";

async function fetchPhone() {
  const response = await fetch("/api/v1/phone");
  if (!response.ok) throw new Error("phone unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  const digits = line.replace(/\D/g, "");
  return line.length >= 8 && digits.length >= 8 && digits.length <= 15 ? line : site.phoneDisplay;
}

export function usePhone() {
  const query = useQuery({
    queryKey: ["phone"],
    queryFn: fetchPhone,
    placeholderData: site.phoneDisplay,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data ?? site.phoneDisplay;
}
