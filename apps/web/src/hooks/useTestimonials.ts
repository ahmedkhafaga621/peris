import { useQuery } from "@tanstack/react-query";
import { site, usableTestimonials } from "@/data/site";

async function fetchTestimonials() {
  const response = await fetch("/api/v1/testimonials");
  if (!response.ok) throw new Error("testimonials unavailable");
  const body = (await response.json()) as { line?: string };
  const line = body.line?.trim() ?? "";
  return usableTestimonials(line) ? line : site.testimonials;
}

export function useTestimonials() {
  const query = useQuery({
    queryKey: ["testimonials"],
    queryFn: fetchTestimonials,
    placeholderData: site.testimonials,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const line = query.data ?? site.testimonials;
  return usableTestimonials(line) ? line : site.testimonials;
}
