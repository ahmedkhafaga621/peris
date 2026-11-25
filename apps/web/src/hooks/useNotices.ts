import { useQuery } from "@tanstack/react-query";
import { site } from "@/data/site";

export type HouseNotice = {
  id: string;
  message: string;
};

const hoursNotice: HouseNotice[] = [{ id: "boutique-hours", message: site.announcement }];

async function fetchNotices(): Promise<HouseNotice[]> {
  const response = await fetch("/api/v1/announcements");
  if (!response.ok) throw new Error("notices unavailable");
  const body = (await response.json()) as { announcements: HouseNotice[] };
  return body.announcements;
}

export function useNotices() {
  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchNotices,
    placeholderData: hoursNotice,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return query.data ?? hoursNotice;
}
