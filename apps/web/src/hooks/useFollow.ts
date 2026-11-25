import { useQuery } from "@tanstack/react-query";
import { site, usableFollow } from "@/data/site";

async function fetchFollow() {
  const response = await fetch("/api/v1/follow");
  if (!response.ok) throw new Error("follow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFollow(line) ? line : site.follow;
}

export function useFollow() {
  const query = useQuery({
    queryKey: ["follow"],
    queryFn: fetchFollow,
    placeholderData: site.follow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.follow;
  return usableFollow(line) ? line : site.follow;
}
