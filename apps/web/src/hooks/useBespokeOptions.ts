import { useQuery } from "@tanstack/react-query";

export type BespokeOptions = {
  designs: string[];
  fabrics: string[];
  colors: string[];
  lengths: number[];
};

async function fetchBespokeOptions(): Promise<BespokeOptions> {
  const response = await fetch("/api/v1/bespoke/options");
  if (!response.ok) throw new Error("bespoke options unavailable");
  const body = (await response.json()) as Partial<BespokeOptions>;
  return {
    designs: Array.isArray(body.designs) ? body.designs : [],
    fabrics: Array.isArray(body.fabrics) ? body.fabrics : [],
    colors: Array.isArray(body.colors) ? body.colors : [],
    lengths: Array.isArray(body.lengths) ? body.lengths : [],
  };
}

export function useBespokeOptionsQuery() {
  return useQuery({
    queryKey: ["bespoke-options"],
    queryFn: fetchBespokeOptions,
    retry: 1,
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}
