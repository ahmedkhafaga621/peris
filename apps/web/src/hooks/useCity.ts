import { useQuery } from "@tanstack/react-query";
import { site, usableCity } from "@/data/site";

async function fetchCity() {
  const response = await fetch("/api/v1/city");
  if (!response.ok) throw new Error("city unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableCity(line) ? line : site.city;
}

export function useCity() {
  const query = useQuery({
    queryKey: ["city"],
    queryFn: fetchCity,
    placeholderData: site.city,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.city;
  return usableCity(line) ? line : site.city;
}
