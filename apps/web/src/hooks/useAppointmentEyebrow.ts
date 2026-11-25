import { useQuery } from "@tanstack/react-query";
import { site, usableAppointmentEyebrow } from "@/data/site";

async function fetchAppointmentEyebrow() {
  const response = await fetch("/api/v1/appointmenteyebrow");
  if (!response.ok) throw new Error("appointment eyebrow unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableAppointmentEyebrow(line) ? line : site.appointmentEyebrow;
}

export function useAppointmentEyebrow() {
  const query = useQuery({
    queryKey: ["appointmenteyebrow"],
    queryFn: fetchAppointmentEyebrow,
    placeholderData: site.appointmentEyebrow,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.appointmentEyebrow;
  return usableAppointmentEyebrow(line) ? line : site.appointmentEyebrow;
}
