import { useQuery } from "@tanstack/react-query";
import { site, usableExploreCta } from "@/data/site";

async function fetchExploreCta() {
  const response = await fetch("/api/v1/explorecta");
  if (!response.ok) throw new Error("explorecta unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableExploreCta(line) ? line : site.exploreCta;
}

export function useExploreCta() {
  const query = useQuery({
    queryKey: ["explorecta"],
    queryFn: fetchExploreCta,
    placeholderData: site.exploreCta,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.exploreCta;
  return usableExploreCta(line) ? line : site.exploreCta;
}
