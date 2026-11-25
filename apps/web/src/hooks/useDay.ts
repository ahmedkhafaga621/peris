import { useQuery } from "@tanstack/react-query";
import { site, usableDay } from "@/data/site";

async function fetchDay() {
  const response = await fetch("/api/v1/day");
  if (!response.ok) throw new Error("day unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableDay(line) ? line : site.day;
}

export function useDay() {
  const query = useQuery({
    queryKey: ["day"],
    queryFn: fetchDay,
    placeholderData: site.day,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.day;
  return usableDay(line) ? line : site.day;
}
