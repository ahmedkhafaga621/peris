import { useSession } from "./useSession";
import { useWishlist } from "./useWishlist";

let syncEnabled = false;
let applying = false;
let ticket = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export function enableWishlistSync() {
  if (syncEnabled) return;
  syncEnabled = true;
  useWishlist.subscribe((state, previous) => {
    if (!syncEnabled || applying || state.ids === previous.ids) return;
    const token = useSession.getState().accessToken;
    if (!token) return;
    clearTimeout(timer);
    const ids = state.ids;
    timer = setTimeout(() => {
      void pushWishlist(ids, token);
    }, 300);
  });
}

export function applyServerIds(ids: string[]) {
  applying = true;
  useWishlist.getState().replace(ids);
  applying = false;
}

export async function pullWishlist(token: string) {
  const result = await request("GET", undefined, token);
  if (result.ok && result.productIds) applyServerIds(result.productIds);
}

export async function mergeWishlist(ids: string[], token: string) {
  const current = await request("GET", undefined, token);
  const combined = [...new Set([...(current.productIds ?? []), ...ids])];
  const saved = await request("PUT", { productIds: combined }, token);
  if (saved.ok && saved.productIds) applyServerIds(saved.productIds);
}

async function pushWishlist(ids: string[], token: string) {
  const current = ++ticket;
  const result = await request("PUT", { productIds: ids }, token);
  if (current !== ticket || !result.ok || !result.productIds) return;
  applyServerIds(result.productIds);
}

async function request(method: string, body: unknown, token: string) {
  try {
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const response = await fetch("/api/v1/account/wishlist", {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { productIds?: string[] };
    if (!response.ok) return { ok: false };
    return { ok: true, productIds: data.productIds ?? [] };
  } catch {
    return { ok: false };
  }
}
