import { useQuery } from "@tanstack/react-query";
import { homeIntro, usableIntro } from "@/data/site";

async function fetchIntro() {
  const response = await fetch("/api/v1/intro");
  if (!response.ok) throw new Error("intro unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableIntro(line) ? line : homeIntro;
}

export function useIntro() {
  const query = useQuery({
    queryKey: ["intro"],
    queryFn: fetchIntro,
    placeholderData: homeIntro,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? homeIntro;
  return usableIntro(line) ? line : homeIntro;
}
