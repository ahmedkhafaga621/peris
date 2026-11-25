import { useQuery } from "@tanstack/react-query";
import { site, usableContactEyebrow } from "@/data/site";

async function fetchContactEyebrow() {
  const response = await fetch("/api/v1/contacteyebrow");
  if (!response.ok) throw new Error("contact eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableContactEyebrow(line) ? line : site.contactEyebrow;
}

export function useContactEyebrow() {
  const query = useQuery({
    queryKey: ["contacteyebrow"],
    queryFn: fetchContactEyebrow,
    placeholderData: site.contactEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.contactEyebrow;
  return usableContactEyebrow(line) ? line : site.contactEyebrow;
}
