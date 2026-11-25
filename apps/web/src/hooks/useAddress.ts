import { useQuery } from "@tanstack/react-query";
import { site } from "@/data/site";

async function fetchAddress() {
  const response = await fetch("/api/v1/address");
  if (!response.ok) throw new Error("address unavailable");
  const body = (await response.json()) as { line?: string };
  return body.line && body.line.trim().length >= 8 ? body.line : site.address;
}

export function useAddress() {
  const query = useQuery({
    queryKey: ["address"],
    queryFn: fetchAddress,
    placeholderData: site.address,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data ?? site.address;
}
