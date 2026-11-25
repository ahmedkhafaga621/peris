import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  ids: string[];
  toggle: (productId: string) => void;
  replace: (ids: string[]) => void;
  has: (productId: string) => boolean;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids.includes(productId)
          ? get().ids.filter((id) => id !== productId)
          : [...get().ids, productId];
        set({ ids });
      },
      replace: (ids) => set({ ids }),
      has: (productId) => get().ids.includes(productId),
    }),
    { name: "peris-wishlist" },
  ),
);
