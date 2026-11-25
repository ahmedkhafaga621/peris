import { useQuery } from "@tanstack/react-query";
import { site, usableEmailLabel } from "@/data/site";

async function fetchEmailLabel() {
  const response = await fetch("/api/v1/emaillabel");
  if (!response.ok) throw new Error("emaillabel unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableEmailLabel(line) ? line : site.emailLabel;
}

export function useEmailLabel() {
  const query = useQuery({
    queryKey: ["emaillabel"],
    queryFn: fetchEmailLabel,
    placeholderData: site.emailLabel,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.emailLabel;
  return usableEmailLabel(line) ? line : site.emailLabel;
}
