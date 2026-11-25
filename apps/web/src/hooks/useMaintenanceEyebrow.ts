import { useQuery } from "@tanstack/react-query";
import { site, usableMaintenanceEyebrow } from "@/data/site";

async function fetchMaintenanceEyebrow() {
  const response = await fetch("/api/v1/maintenanceeyebrow");
  if (!response.ok) throw new Error("maintenance eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableMaintenanceEyebrow(line) ? line : site.maintenanceEyebrow;
}

export function useMaintenanceEyebrow() {
  const query = useQuery({
    queryKey: ["maintenanceeyebrow"],
    queryFn: fetchMaintenanceEyebrow,
    placeholderData: site.maintenanceEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.maintenanceEyebrow;
  return usableMaintenanceEyebrow(line) ? line : site.maintenanceEyebrow;
}
