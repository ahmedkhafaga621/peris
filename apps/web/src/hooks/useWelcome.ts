import { useQuery } from "@tanstack/react-query";
import { contactWelcome, usableWelcome } from "@/data/site";

async function fetchWelcome() {
  const response = await fetch("/api/v1/welcome");
  if (!response.ok) throw new Error("welcome unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableWelcome(line) ? line : contactWelcome;
}

export function useWelcome() {
  const query = useQuery({
    queryKey: ["welcome"],
    queryFn: fetchWelcome,
    placeholderData: contactWelcome,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? contactWelcome;
  return usableWelcome(line) ? line : contactWelcome;
}
