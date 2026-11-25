import { useQuery } from "@tanstack/react-query";
import { site, usableAccountEyebrow } from "@/data/site";

async function fetchAccountEyebrow() {
  const response = await fetch("/api/v1/accounteyebrow");
  if (!response.ok) throw new Error("account eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableAccountEyebrow(line) ? line : site.accountEyebrow;
}

export function useAccountEyebrow() {
  const query = useQuery({
    queryKey: ["accounteyebrow"],
    queryFn: fetchAccountEyebrow,
    placeholderData: site.accountEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.accountEyebrow;
  return usableAccountEyebrow(line) ? line : site.accountEyebrow;
}
