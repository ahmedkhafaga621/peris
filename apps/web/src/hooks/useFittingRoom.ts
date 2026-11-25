import { useQuery } from "@tanstack/react-query";
import { site, usableFittingRoom } from "@/data/site";

async function fetchFittingRoom() {
  const response = await fetch("/api/v1/fittingroom");
  if (!response.ok) throw new Error("fittingroom unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableFittingRoom(line) ? line : site.fittingRoom;
}

export function useFittingRoom() {
  const query = useQuery({
    queryKey: ["fittingroom"],
    queryFn: fetchFittingRoom,
    placeholderData: site.fittingRoom,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.fittingRoom;
  return usableFittingRoom(line) ? line : site.fittingRoom;
}
