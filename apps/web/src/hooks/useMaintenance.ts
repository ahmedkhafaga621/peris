import { useQuery } from "@tanstack/react-query";

async function fetchMaintenance() {
  const response = await fetch("/api/v1/maintenance");
  if (!response.ok) throw new Error("maintenance unavailable");
  const body = (await response.json()) as { closed?: boolean };
  return body.closed === true;
}

export function useMaintenance() {
  const query = useQuery({
    queryKey: ["maintenance"],
    queryFn: fetchMaintenance,
    placeholderData: false,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data === true;
}
