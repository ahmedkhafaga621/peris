import { useQuery } from "@tanstack/react-query";
import { site, usablePolicyBanner } from "@/data/site";

async function fetchPolicyBanner() {
  const response = await fetch("/api/v1/policybanner");
  if (!response.ok) throw new Error("policy banner unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usablePolicyBanner(line) ? line : site.policyBanner;
}

export function usePolicyBanner() {
  const query = useQuery({
    queryKey: ["policybanner"],
    queryFn: fetchPolicyBanner,
    placeholderData: site.policyBanner,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.policyBanner;
  return usablePolicyBanner(line) ? line : site.policyBanner;
}
