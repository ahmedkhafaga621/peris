export const ABAYA_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export const ABAYA_LENGTHS = [50, 52, 54, 56, 58, 60] as const;

export type AbayaSize = (typeof ABAYA_SIZES)[number];

export function formatAed(fils: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(fils / 100);
}
