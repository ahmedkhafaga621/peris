import { useQuery } from "@tanstack/react-query";
import { site, usableDetail } from "@/data/site";

async function fetchDetail() {
  const response = await fetch("/api/v1/detail");
  if (!response.ok) throw new Error("detail unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableDetail(line) ? line : site.detail;
}

export function useDetail() {
  const query = useQuery({
    queryKey: ["detail"],
    queryFn: fetchDetail,
    placeholderData: site.detail,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.detail;
  return usableDetail(line) ? line : site.detail;
}
