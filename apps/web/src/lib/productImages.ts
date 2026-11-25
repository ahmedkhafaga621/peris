import type { CatalogImage } from "@/data/catalog";

/** Images for the selected color, then unassigned, then the full set. */
export function galleryForColor(
  images: CatalogImage[],
  colorName: string | null | undefined,
) {
  if (!images.length) return [];
  if (colorName) {
    const matched = images.filter((image) => image.color === colorName);
    if (matched.length) return matched;
  }
  const shared = images.filter((image) => !image.color);
  return shared.length ? shared : images;
}

export function primaryImageForColor(
  images: CatalogImage[],
  colorName: string | null | undefined,
) {
  return galleryForColor(images, colorName)[0] ?? images[0];
}
