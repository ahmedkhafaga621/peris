export type Colorway = {
  id?: string;
  name: string;
  hex: string;
};

export type CatalogImage = {
  id?: string;
  src: string;
  alt: string;
  position?: string;
  colorId?: string | null;
  color?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  priceFils: number;
  compareAtFils?: number;
  collection: "casual-elegance" | "evening-occasions" | "bespoke-designs";
  fabric: string;
  description: string;
  colors: Colorway[];
  sizes?: string[];
  lengths?: number[];
  stock?: { color: string; size: string; available: number }[];
  images: CatalogImage[];
  isNew?: boolean;
  isBestseller?: boolean;
  placeholder: boolean;
};

export const collections = [
  {
    slug: "casual-elegance",
    name: "Casual Elegance",
    description: "Practical, comfortable, and effortlessly chic for your everyday wear.",
    image: "/media/gray.jpg",
    position: "center top",
  },
  {
    slug: "evening-occasions",
    name: "Evening & Occasions",
    description: "Luxurious designs and exquisite embroidery to make you shine on your special nights.",
    image: "/media/floral.jpg",
    position: "center",
  },
  {
    slug: "bespoke-designs",
    name: "Bespoke Designs",
    description: "Design your own Abaya, and let our master tailors turn your vision into reality.",
    image: "",
    position: "center",
  },
] as const;

/**
 * Temporary studies for layout only. These are not PERIS campaign photographs.
 * Replace the files in public/media when the house archive is ready.
 * Credits: Abdul Raheem Kannath, Unsplash.
 */
export const products: Product[] = [
  {
    id: "noor-column",
    slug: "noor-column-abaya",
    sku: "SAMPLE-NOOR",
    name: "Noor Column Abaya",
    priceFils: 89000,
    collection: "casual-elegance",
    fabric: "Sample crepe",
    description:
      "A quiet column with a deep opening and a long, unbroken line. This sample stands in for a PERIS day piece until the house photographs its own cloth.",
    colors: [
      { name: "Black", hex: "#161616" },
      { name: "Sand", hex: "#cbbfa8" },
    ],
    images: [
      {
        src: "/media/flowing.jpg",
        alt: "Placeholder study of a black column abaya against a burgundy curtain",
        position: "center top",
      },
      {
        src: "/media/floral.jpg",
        alt: "Closer detail of embroidery and cloth for the Noor column study",
        position: "center",
      },
    ],
    isBestseller: true,
    placeholder: true,
  },
  {
    id: "layl-embroidery",
    slug: "layl-embroidery-abaya",
    sku: "SAMPLE-LAYL",
    name: "Layl Embroidery Abaya",
    priceFils: 168000,
    compareAtFils: 189000,
    collection: "evening-occasions",
    fabric: "Sample nida",
    description:
      "An evening neckline with floral embroidery and a lace cuff. The photograph is a placeholder detail, not a PERIS production garment.",
    colors: [
      { name: "Black", hex: "#161616" },
      { name: "Burgundy", hex: "#751629" },
    ],
    images: [
      {
        src: "/media/floral.jpg",
        alt: "Placeholder study of black abaya embroidery and a lace cuff",
        position: "center",
      },
      {
        src: "/media/flowing.jpg",
        alt: "Closer view of the Layl evening silhouette",
        position: "center top",
      },
    ],
    isBestseller: true,
    placeholder: true,
  },
  {
    id: "sahar-day",
    slug: "sahar-day-abaya",
    sku: "SAMPLE-SAHAR",
    name: "Sahar Day Abaya",
    priceFils: 76000,
    collection: "casual-elegance",
    fabric: "Sample linen blend",
    description:
      "A lighter day silhouette with stitched cuffs. Shown here as a sample study while the PERIS day collection is being photographed.",
    colors: [
      { name: "Stone", hex: "#9aa3a8" },
      { name: "Ivory", hex: "#f3efe4" },
    ],
    images: [
      {
        src: "/media/gray.jpg",
        alt: "Placeholder study of a gray day abaya",
        position: "center top",
      },
      {
        src: "/media/flowing.jpg",
        alt: "Closer day silhouette study for Sahar",
        position: "center",
      },
    ],
    isNew: true,
    placeholder: true,
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function productsInCollection(slug: string) {
  return products.filter((product) => product.collection === slug);
}

export const bestSellers = products.filter((product) => product.isBestseller);
export const newArrivals = products.filter((product) => product.isNew);

export function searchProducts(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return products;
  return products.filter((product) =>
    [product.name, product.sku, product.fabric, product.description, product.collection]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}
