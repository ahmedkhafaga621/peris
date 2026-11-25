import { useQuery } from "@tanstack/react-query";
import { site, usableBeginCta } from "@/data/site";

async function fetchBeginCta() {
  const response = await fetch("/api/v1/begincta");
  if (!response.ok) throw new Error("begincta unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableBeginCta(line) ? line : site.beginCta;
}

export function useBeginCta() {
  const query = useQuery({
    queryKey: ["begincta"],
    queryFn: fetchBeginCta,
    placeholderData: site.beginCta,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.beginCta;
  return usableBeginCta(line) ? line : site.beginCta;
}
