import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  color: string;
  size: string;
  lengthInches: number;
  quantity: number;
  unitPriceFils: number;
};

type CartDraft = Omit<CartLine, "id" | "quantity"> & { quantity?: number };

type CartState = {
  lines: CartLine[];
  notice: string | null;
  add: (line: CartDraft) => void;
  setQty: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  replace: (lines: CartLine[]) => void;
  setNotice: (notice: string | null) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      notice: null,
      add: (line) => {
        const id = `${line.productId}|${line.color}|${line.size}|${line.lengthInches}`;
        const quantity = line.quantity ?? 1;
        const existing = get().lines.find((item) => item.id === id);
        if (existing) {
          set({
            lines: get().lines.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity + quantity } : item,
            ),
          });
          return;
        }
        set({ lines: [...get().lines, { ...line, id, quantity }] });
      },
      setQty: (id, quantity) => {
        if (quantity < 1) {
          set({ lines: get().lines.filter((item) => item.id !== id) });
          return;
        }
        set({
          lines: get().lines.map((item) => (item.id === id ? { ...item, quantity } : item)),
        });
      },
      remove: (id) => set({ lines: get().lines.filter((item) => item.id !== id) }),
      replace: (lines) => set({ lines, notice: null }),
      setNotice: (notice) => set({ notice }),
    }),
    { name: "peris-cart", partialize: (state) => ({ lines: state.lines }) },
  ),
);

export function useCartCount() {
  return useCart((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.unitPriceFils * line.quantity, 0);
}
