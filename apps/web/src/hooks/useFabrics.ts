import { useQuery } from "@tanstack/react-query";

export type HouseFabric = {
  name: string;
  description: string;
  imageUrl: string;
};

const fabricPortraits = new Map<string, HouseFabric>([
  [
    "crepe",
    {
      name: "Crepe",
      description: "Light and fluid, with a soft fall.",
      imageUrl: "/media/fabric-crepe.jpg",
    },
  ],
  [
    "nida",
    {
      name: "Nida",
      description: "Firm and smooth, holding a clean line.",
      imageUrl: "/media/fabric-nida.jpg",
    },
  ],
  [
    "silk blend",
    {
      name: "Silk blend",
      description: "A quiet sheen for evening.",
      imageUrl: "/media/fabric-silk.jpg",
    },
  ],
  [
    "linen blend",
    {
      name: "Linen blend",
      description: "Dry and breathable for the day.",
      imageUrl: "/media/fabric-linen.jpg",
    },
  ],
]);

function present(name: string, description = "", imageUrl = ""): HouseFabric {
  const known = fabricPortraits.get(name.trim().toLowerCase());
  return {
    name,
    description: description || known?.description || "",
    imageUrl: imageUrl || known?.imageUrl || "",
  };
}

async function fetchFabrics(): Promise<HouseFabric[]> {
  const response = await fetch("/api/v1/fabrics");
  if (!response.ok) throw new Error("fabrics unavailable");
  const body = (await response.json()) as { fabrics?: unknown };
  if (!Array.isArray(body.fabrics)) return [];
  return body.fabrics.flatMap((item) => {
    if (typeof item === "string") return [present(item)];
    if (!item || typeof item !== "object") return [];
    const row = item as { name?: unknown; description?: unknown; imageUrl?: unknown };
    if (typeof row.name !== "string" || row.name.trim().length < 2) return [];
    return [
      present(
        row.name,
        typeof row.description === "string" ? row.description : "",
        typeof row.imageUrl === "string" ? row.imageUrl : "",
      ),
    ];
  });
}

export function useFabrics() {
  const query = useQuery({
    queryKey: ["fabrics"],
    queryFn: fetchFabrics,
    retry: 1,
    staleTime: 30_000,
  });
  return query.data ?? [];
}
