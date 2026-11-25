import { useQuery } from "@tanstack/react-query";
import { site, usableCorrespondence } from "@/data/site";

async function fetchCorrespondence() {
  const response = await fetch("/api/v1/correspondence");
  if (!response.ok) throw new Error("correspondence unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCorrespondence(line) ? line : site.correspondence;
}

export function useCorrespondence() {
  const query = useQuery({
    queryKey: ["correspondence"],
    queryFn: fetchCorrespondence,
    placeholderData: site.correspondence,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.correspondence;
  return usableCorrespondence(line) ? line : site.correspondence;
}
