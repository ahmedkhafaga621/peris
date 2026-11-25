import { useQuery } from "@tanstack/react-query";
import { site, usableSample } from "@/data/site";

async function fetchSample() {
  const response = await fetch("/api/v1/sample");
  if (!response.ok) throw new Error("sample unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableSample(line) ? line : site.sample;
}

export function useSample() {
  const query = useQuery({
    queryKey: ["sample"],
    queryFn: fetchSample,
    placeholderData: site.sample,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.sample;
  return usableSample(line) ? line : site.sample;
}
