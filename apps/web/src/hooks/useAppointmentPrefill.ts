import { useQuery } from "@tanstack/react-query";
import { site, usableAppointmentPrefill } from "@/data/site";

async function fetchAppointmentPrefill() {
  const response = await fetch("/api/v1/appointmentprefill");
  if (!response.ok) throw new Error("appointment prefill unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableAppointmentPrefill(line) ? line : site.appointmentPrefill;
}

export function useAppointmentPrefill() {
  const query = useQuery({
    queryKey: ["appointmentprefill"],
    queryFn: fetchAppointmentPrefill,
    placeholderData: site.appointmentPrefill,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.appointmentPrefill;
  return usableAppointmentPrefill(line) ? line : site.appointmentPrefill;
}
