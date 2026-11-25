import { useQuery } from "@tanstack/react-query";
import { site } from "@/data/site";

async function fetchHours() {
  const response = await fetch("/api/v1/hours");
  if (!response.ok) throw new Error("hours unavailable");
  const body = (await response.json()) as { line?: string };
  return body.line && body.line.trim().length >= 8 ? body.line : site.hours;
}

export function useHours() {
  const query = useQuery({
    queryKey: ["hours"],
    queryFn: fetchHours,
    placeholderData: site.hours,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data ?? site.hours;
}
