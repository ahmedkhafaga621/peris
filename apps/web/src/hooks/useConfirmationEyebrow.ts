import { useQuery } from "@tanstack/react-query";
import { site, usableConfirmationEyebrow } from "@/data/site";

async function fetchConfirmationEyebrow() {
  const response = await fetch("/api/v1/confirmationeyebrow");
  if (!response.ok) throw new Error("confirmation eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableConfirmationEyebrow(line) ? line : site.confirmationEyebrow;
}

export function useConfirmationEyebrow() {
  const query = useQuery({
    queryKey: ["confirmationeyebrow"],
    queryFn: fetchConfirmationEyebrow,
    placeholderData: site.confirmationEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.confirmationEyebrow;
  return usableConfirmationEyebrow(line) ? line : site.confirmationEyebrow;
}
