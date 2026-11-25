import { useQuery } from "@tanstack/react-query";
import { site, usableReasonIndex } from "@/data/site";

type ReasonSlot = 1 | 2 | 3;

const fallbacks: Record<ReasonSlot, string> = {
  1: site.reasonIndex1,
  2: site.reasonIndex2,
  3: site.reasonIndex3,
};

export function useReasonIndex(slot: ReasonSlot) {
  const key = `reasonidx${slot}`;
  const fallback = fallbacks[slot];

  const query = useQuery({
    queryKey: [key],
    queryFn: async () => {
      const response = await fetch(`/api/v1/${key}`);
      if (!response.ok) throw new Error(`${key} unavailable`);
      const body = (await response.json()) as { line?: string };
      const line = body.line?.trim() ?? "";
      return usableReasonIndex(line) ? line : fallback;
    },
    placeholderData: fallback,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? fallback;
  return usableReasonIndex(line) ? line : fallback;
}
