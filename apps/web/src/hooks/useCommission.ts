import { useQuery } from "@tanstack/react-query";
import { site, usableCommission } from "@/data/site";

async function fetchCommission() {
  const response = await fetch("/api/v1/commission");
  if (!response.ok) throw new Error("commission unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCommission(line) ? line : site.commission;
}

export function useCommission() {
  const query = useQuery({
    queryKey: ["commission"],
    queryFn: fetchCommission,
    placeholderData: site.commission,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.commission;
  return usableCommission(line) ? line : site.commission;
}
