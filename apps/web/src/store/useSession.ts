import { create } from "zustand";
import { useCart } from "./useCart";

export type AccountUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

type SessionState = {
  user: AccountUser | null;
  accessToken: string | null;
  ready: boolean;
  setSession: (user: AccountUser, accessToken: string) => void;
  clear: () => void;
  markReady: () => void;
};

export const useSession = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setSession: (user, accessToken) => set({ user, accessToken, ready: true }),
  clear: () => set({ user: null, accessToken: null, ready: true }),
  markReady: () => set({ ready: true }),
}));

let restoring: Promise<void> | null = null;

export function bootstrapSession() {
  if (!restoring) restoring = restore();
  return restoring;
}

async function restore() {
  const { enableCartSync, mergeLocalCart, pullCart, pushCart } =
    await import("./syncCart");
  const { enableWishlistSync, pullWishlist } = await import("./syncWishlist");
  try {
    const response = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    const data = response.ok
      ? ((await response.json().catch(() => null)) as {
          accessToken?: string;
          user?: AccountUser | null;
        } | null)
      : null;
    if (!data?.accessToken || !data.user) {
      useSession.getState().markReady();
      const local = useCart.getState().lines;
      if (local.length > 0) await pushCart(local);
      else await pullCart(null);
      enableCartSync();
      enableWishlistSync();
      return;
    }
    useSession.getState().setSession(data.user, data.accessToken);
    await mergeLocalCart(useCart.getState().lines, data.accessToken);
    await pullWishlist(data.accessToken);
  } catch {
    useSession.getState().markReady();
  }
  enableCartSync();
  enableWishlistSync();
}

export async function signIn(email: string, password: string) {
  const data = await postAccount("/api/v1/auth/login", { email, password });
  await adopt(data);
}

export async function registerAccount(input: { firstName: string; lastName: string; email: string; password: string }) {
  const data = await postAccount("/api/v1/auth/register", input);
  await adopt(data);
}

export async function signOut() {
  await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
  useSession.getState().clear();
  const { applyServerLines } = await import("./syncCart");
  const { applyServerIds } = await import("./syncWishlist");
  applyServerLines([]);
  applyServerIds([]);
}

async function adopt(data: { accessToken: string; user: AccountUser }) {
  const lines = useCart.getState().lines;
  const saved = (await import("./useWishlist")).useWishlist.getState().ids;
  useSession.getState().setSession(data.user, data.accessToken);
  const { mergeLocalCart } = await import("./syncCart");
  const { mergeWishlist } = await import("./syncWishlist");
  await mergeLocalCart(lines, data.accessToken);
  await mergeWishlist(saved, data.accessToken);
}

async function postAccount(path: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The atelier system is not reachable. Nothing was saved.");
  }
  const data = (await response.json().catch(() => ({}))) as { accessToken?: string; user?: AccountUser; error?: string };
  if (!response.ok || !data.accessToken || !data.user) {
    throw new Error(data.error ?? "The account could not be opened.");
  }
  return { accessToken: data.accessToken, user: data.user };
}
