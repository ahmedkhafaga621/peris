import { useQuery } from "@tanstack/react-query";
import { site, usableFaqEyebrow } from "@/data/site";

async function fetchFaqEyebrow() {
  const response = await fetch("/api/v1/faqeyebrow");
  if (!response.ok) throw new Error("faq eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFaqEyebrow(line) ? line : site.faqEyebrow;
}

export function useFaqEyebrow() {
  const query = useQuery({
    queryKey: ["faqeyebrow"],
    queryFn: fetchFaqEyebrow,
    placeholderData: site.faqEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.faqEyebrow;
  return usableFaqEyebrow(line) ? line : site.faqEyebrow;
}
