import { useQuery } from "@tanstack/react-query";
import { site, usableSketch } from "@/data/site";

async function fetchSketch() {
  const response = await fetch("/api/v1/sketch");
  if (!response.ok) throw new Error("sketch unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSketch(line) ? line : site.sketch;
}

export function useSketch() {
  const query = useQuery({
    queryKey: ["sketch"],
    queryFn: fetchSketch,
    placeholderData: site.sketch,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.sketch;
  return usableSketch(line) ? line : site.sketch;
}
