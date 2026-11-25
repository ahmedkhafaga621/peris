import { useCart, type CartLine } from "./useCart";
import { useSession } from "./useSession";

type CartPayload = { lines?: CartLine[]; error?: string };

let syncEnabled = false;
let applying = false;
let ticket = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export function enableCartSync() {
  if (syncEnabled) return;
  syncEnabled = true;
  useCart.subscribe((state, previous) => {
    if (!syncEnabled || applying || state.lines === previous.lines) return;
    clearTimeout(timer);
    const lines = state.lines;
    timer = setTimeout(() => {
      void pushCart(lines);
    }, 300);
  });
}

export function applyServerLines(lines: CartLine[]) {
  applying = true;
  useCart.getState().replace(lines);
  applying = false;
}

export async function pushCart(lines: CartLine[]) {
  const current = ++ticket;
  const result = await request("/api/v1/cart", "PUT", { lines: payload(lines) }, useSession.getState().accessToken);
  if (current !== ticket) return;
  if (!result.ok || !result.lines) {
    useCart.getState().setNotice(result.error ?? "The bag is saved on this device. The price was not confirmed.");
    return;
  }
  applyServerLines(result.lines);
}

export async function pullCart(token: string | null = useSession.getState().accessToken) {
  const result = await request("/api/v1/cart", "GET", undefined, token);
  if (result.ok && result.lines) applyServerLines(result.lines);
  else if (!result.ok) {
    useCart.getState().setNotice(result.error ?? "The saved bag could not be opened.");
  }
  return result;
}

export async function mergeLocalCart(lines: CartLine[], token: string) {
  if (lines.length === 0) {
    await pullCart(token);
    return;
  }
  const result = await request("/api/v1/cart/merge", "POST", { lines: payload(lines) }, token);
  if (result.ok && result.lines) applyServerLines(result.lines);
  else useCart.getState().setNotice(result.error ?? "The bag could not be saved to the account.");
}

function payload(lines: CartLine[]) {
  return lines.map(({ productId, color, size, lengthInches, quantity }) => ({
    productId,
    color,
    size,
    lengthInches,
    quantity,
  }));
}

async function request(path: string, method: string, body: unknown, token: string | null) {
  try {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const response = await fetch(path, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as CartPayload;
    if (!response.ok) return { ok: false, error: data.error };
    return { ok: true, lines: data.lines ?? [] };
  } catch {
    return { ok: false, error: "The bag is saved on this device. The atelier system did not confirm the price." };
  }
}
