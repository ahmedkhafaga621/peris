import { useQuery } from "@tanstack/react-query";
import { site, usableBespokeEyebrow } from "@/data/site";

async function fetchBespokeEyebrow() {
  const response = await fetch("/api/v1/bespokeeyebrow");
  if (!response.ok) throw new Error("bespoke eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableBespokeEyebrow(line) ? line : site.bespokeEyebrow;
}

export function useBespokeEyebrow() {
  const query = useQuery({
    queryKey: ["bespokeeyebrow"],
    queryFn: fetchBespokeEyebrow,
    placeholderData: site.bespokeEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.bespokeEyebrow;
  return usableBespokeEyebrow(line) ? line : site.bespokeEyebrow;
}
