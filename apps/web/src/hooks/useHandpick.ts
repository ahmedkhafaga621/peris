import { useQuery } from "@tanstack/react-query";
import { site, usableHandpick } from "@/data/site";

async function fetchHandpick() {
  const response = await fetch("/api/v1/handpick");
  if (!response.ok) throw new Error("handpick unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableHandpick(line) ? line : site.handpick;
}

export function useHandpick() {
  const query = useQuery({
    queryKey: ["handpick"],
    queryFn: fetchHandpick,
    placeholderData: site.handpick,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.handpick;
  return usableHandpick(line) ? line : site.handpick;
}
