import { useQuery } from "@tanstack/react-query";
import { site, usablePolicyEyebrow } from "@/data/site";

async function fetchPolicyEyebrow() {
  const response = await fetch("/api/v1/policyeyebrow");
  if (!response.ok) throw new Error("policy eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usablePolicyEyebrow(line) ? line : site.policyEyebrow;
}

export function usePolicyEyebrow() {
  const query = useQuery({
    queryKey: ["policyeyebrow"],
    queryFn: fetchPolicyEyebrow,
    placeholderData: site.policyEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.policyEyebrow;
  return usablePolicyEyebrow(line) ? line : site.policyEyebrow;
}
