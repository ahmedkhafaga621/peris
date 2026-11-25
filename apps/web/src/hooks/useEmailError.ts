import { useQuery } from "@tanstack/react-query";
import { site, usableEmailError } from "@/data/site";

async function fetchEmailError() {
  const response = await fetch("/api/v1/emailerr");
  if (!response.ok) throw new Error("emailerr unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableEmailError(line) ? line : site.emailError;
}

export function useEmailError() {
  const query = useQuery({
    queryKey: ["emailerr"],
    queryFn: fetchEmailError,
    placeholderData: site.emailError,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.emailError;
  return usableEmailError(line) ? line : site.emailError;
}
