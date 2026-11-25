import { useQuery } from "@tanstack/react-query";
import { site, usableNotFoundEyebrow } from "@/data/site";

async function fetchNotFoundEyebrow() {
  const response = await fetch("/api/v1/notfoundeyebrow");
  if (!response.ok) throw new Error("404 eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableNotFoundEyebrow(line) ? line : site.notFoundEyebrow;
}

export function useNotFoundEyebrow() {
  const query = useQuery({
    queryKey: ["notfoundeyebrow"],
    queryFn: fetchNotFoundEyebrow,
    placeholderData: site.notFoundEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.notFoundEyebrow;
  return usableNotFoundEyebrow(line) ? line : site.notFoundEyebrow;
}
