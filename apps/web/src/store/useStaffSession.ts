import { create } from "zustand";

export type StaffUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
};

type StaffState = {
  user: StaffUser | null;
  accessToken: string | null;
  ready: boolean;
  setSession: (user: StaffUser, accessToken: string) => void;
  clear: () => void;
  markReady: () => void;
};

export const useStaffSession = create<StaffState>((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setSession: (user, accessToken) => set({ user, accessToken, ready: true }),
  clear: () => set({ user: null, accessToken: null, ready: true }),
  markReady: () => set({ ready: true }),
}));

let restoring: Promise<void> | null = null;

export function bootstrapStaff() {
  if (!restoring) restoring = restore();
  return restoring;
}

async function restore() {
  try {
    const response = await fetch("/api/v1/admin/auth/refresh", { method: "POST", credentials: "include" });
    if (!response.ok) {
      useStaffSession.getState().markReady();
      return;
    }
    const data = (await response.json()) as { accessToken: string; user: StaffUser };
    useStaffSession.getState().setSession(data.user, data.accessToken);
  } catch {
    useStaffSession.getState().markReady();
  }
}

export async function staffSignIn(email: string, password: string) {
  const response = await fetch("/api/v1/admin/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await response.json().catch(() => ({}))) as { accessToken?: string; user?: StaffUser; error?: string };
  if (!response.ok || !data.accessToken || !data.user) throw new Error(data.error ?? "The staff entrance did not open.");
  useStaffSession.getState().setSession(data.user, data.accessToken);
}

export async function staffSignOut() {
  await fetch("/api/v1/admin/auth/logout", { method: "POST", credentials: "include" });
  useStaffSession.getState().clear();
}

export async function staffFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const token = useStaffSession.getState().accessToken;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "include" });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401 && retry) {
    const refreshed = await fetch("/api/v1/admin/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const session = (await refreshed.json()) as { accessToken: string; user: StaffUser };
      useStaffSession.getState().setSession(session.user, session.accessToken);
      return staffFetch(path, init, false);
    }
  }
  if (response.status === 401) {
    useStaffSession.getState().clear();
    throw new Error(data.error ?? "Sign in again to the staff entrance.");
  }
  if (!response.ok) throw new Error(data.error ?? "The desk could not complete that.");
  return data;
}
