import { useQuery } from "@tanstack/react-query";
import { site, usableHeading } from "@/data/site";

async function fetchHeading() {
  const response = await fetch("/api/v1/heading");
  if (!response.ok) throw new Error("heading unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableHeading(line) ? line : site.heading;
}

export function useHeading() {
  const query = useQuery({
    queryKey: ["heading"],
    queryFn: fetchHeading,
    placeholderData: site.heading,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.heading;
  return usableHeading(line) ? line : site.heading;
}
