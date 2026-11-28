import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { HttpError } from "./cart.js";
import { requireStaff } from "./staff.js";

export type StoreSettings = {
  name: string;
  logo: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  maps: string;
  parent: string;
  currency: string;
  vatRate: number;
  shippingEnabled: boolean;
  storeOpen: boolean;
  themePrimary: string;
  themeIvory: string;
  homeHero: string;
  homeStory: string;
};

export const defaultStoreSettings: StoreSettings = {
  name: "PERIS",
  logo: "/brand/peris-burgundy.png",
  phone: "+971 50 540 6077",
  whatsapp: "+971505406077",
  email: "info@ljperis.com",
  address:
    "Boutique M01, 3 Floor, Abu Hail Center, Dubai, United Arab Emirates.",
  hours: "Daily from 10:00 AM to 10:00 PM.",
  instagram: "https://www.instagram.com/peris_uae/",
  facebook: "https://www.facebook.com/perisdubai",
  maps: "https://maps.app.goo.gl/YdjuY6Nqnad2rpD36",
  parent: "Lamasat Jawhareya",
  currency: "AED",
  vatRate: 0.05,
  shippingEnabled: true,
  storeOpen: true,
  themePrimary: "#751629",
  themeIvory: "#f8f7ee",
  homeHero: "/media/flowing.jpg",
  homeStory: "/media/floral.jpg",
};

function readString(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "line" in value &&
    typeof value.line === "string"
  ) {
    const trimmed = value.line.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
}

export function normalizeStoredBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < minimum) return fallback;
    if (value > maximum) return fallback;
    return value;
  }
  return fallback;
}

function readImagePath(value: unknown, fallback: string) {
  const candidate = readString(value, fallback);
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  return hasUsableUrl(candidate) ? candidate : fallback;
}

function hasUsableUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizePhone(value: string, fallback: string) {
  const candidate = value.trim();
  if (/^\+?[0-9\s()-.]{8,20}$/.test(candidate)) {
    return candidate;
  }
  return fallback;
}

function normalizeInstagram(value: string, fallback: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return fallback;
    if (
      url.hostname !== "www.instagram.com" &&
      url.hostname !== "instagram.com"
    )
      return fallback;
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9._]{2,30}$/.test(handle) ? value : fallback;
  } catch {
    return fallback;
  }
}

function normalizeFacebook(value: string, fallback: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return fallback;
    if (url.hostname !== "www.facebook.com" && url.hostname !== "facebook.com")
      return fallback;
    const page = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9.]{2,50}$/.test(page) ? value : fallback;
  } catch {
    return fallback;
  }
}

function normalizeMaps(value: string, fallback: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return fallback;
    if (
      url.hostname === "share.google.com" ||
      url.hostname === "share.google"
    ) {
      const token = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{4,80}$/.test(token) ? value : fallback;
    }
    if (
      url.hostname === "maps.google.com" ||
      url.hostname === "www.google.com" ||
      url.hostname === "google.com"
    ) {
      return url.pathname.length > 1 || url.search.length > 1
        ? value
        : fallback;
    }
    if (url.hostname === "maps.app.goo.gl") {
      const token = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{4,80}$/.test(token) ? value : fallback;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function normalizeStoreSettings(
  input: Record<string, unknown> = {},
): StoreSettings {
  const base: StoreSettings = { ...defaultStoreSettings };
  const source = input ?? {};

  base.name = readString(source.name, base.name).slice(0, 80);
  base.logo =
    hasUsableUrl(readString(source.logo, base.logo)) ||
    readString(source.logo, base.logo).startsWith("/")
      ? readString(source.logo, base.logo)
      : base.logo;
  base.phone = normalizePhone(readString(source.phone, base.phone), base.phone);
  base.whatsapp = normalizePhone(
    readString(source.whatsapp, base.whatsapp),
    base.whatsapp,
  );
  base.email = /^(?:[A-Za-z0-9._%+-]+)@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/.test(
    readString(source.email, base.email),
  )
    ? readString(source.email, base.email)
    : base.email;
  base.address = readString(source.address, base.address).slice(0, 220);
  base.hours = readString(source.hours, base.hours).slice(0, 160);
  base.instagram = normalizeInstagram(
    readString(source.instagram, base.instagram),
    base.instagram,
  );
  base.facebook = normalizeFacebook(
    readString(source.facebook, base.facebook),
    base.facebook,
  );
  base.maps = normalizeMaps(readString(source.maps, base.maps), base.maps);
  base.parent = readString(source.parent, base.parent).slice(0, 80);
  base.currency = defaultStoreSettings.currency;
  base.vatRate = readNumber(source.vatRate, base.vatRate, 0, 0.5);
  base.shippingEnabled = normalizeStoredBoolean(
    source.shippingEnabled,
    base.shippingEnabled,
  );
  base.storeOpen = normalizeStoredBoolean(source.storeOpen, base.storeOpen);
  base.themePrimary = /^#[0-9A-Fa-f]{6}$/.test(
    readString(source.themePrimary, base.themePrimary),
  )
    ? readString(source.themePrimary, base.themePrimary)
    : base.themePrimary;
  base.themeIvory = /^#[0-9A-Fa-f]{6}$/.test(
    readString(source.themeIvory, base.themeIvory),
  )
    ? readString(source.themeIvory, base.themeIvory)
    : base.themeIvory;
  base.homeHero = readImagePath(source.homeHero, base.homeHero);
  base.homeStory = readImagePath(source.homeStory, base.homeStory);

  return base;
}

const adminSettingsKeys = Object.keys(defaultStoreSettings) as Array<
  keyof StoreSettings
>;

export async function publicStoreSettings() {
  const rows = await prisma.storeSetting.findMany({
    where: { key: { in: adminSettingsKeys } },
  });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return normalizeStoreSettings(values);
}

export async function publicStorefrontSettings() {
  const settings = await publicStoreSettings();
  return {
    name: settings.name,
    logo: settings.logo,
    email: settings.email,
    whatsapp: settings.whatsapp,
    themePrimary: settings.themePrimary,
    themeIvory: settings.themeIvory,
    homeHero: settings.homeHero,
    homeStory: settings.homeStory,
  };
}

export function normalizeStoredVatRate(
  currentValue: unknown,
  legacyValue: unknown,
) {
  if (typeof currentValue === "number") {
    return readNumber(currentValue, defaultStoreSettings.vatRate, 0, 0.5);
  }
  if (
    legacyValue &&
    typeof legacyValue === "object" &&
    !Array.isArray(legacyValue) &&
    "rate" in legacyValue
  ) {
    return readNumber(legacyValue.rate, defaultStoreSettings.vatRate, 0, 0.5);
  }
  return defaultStoreSettings.vatRate;
}

export async function readStoreVatRate() {
  const rows = await prisma.storeSetting.findMany({
    where: { key: { in: ["vatRate", "vat"] } },
  });
  const current = rows.find((row) => row.key === "vatRate");
  const legacy = rows.find((row) => row.key === "vat");
  return normalizeStoredVatRate(current?.value, legacy?.value);
}

export async function readStoreShippingEnabled() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "shippingEnabled" },
  });
  return normalizeStoredBoolean(
    setting?.value,
    defaultStoreSettings.shippingEnabled,
  );
}

const settingsPatchSchema = z.object({
  settings: z.record(z.string(), z.unknown()).default({}),
});

export async function readAdminSettings(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "settings.write");
  if (!actor) return null;
  return publicStoreSettings();
}

export async function writeAdminSettings(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "settings.write");
  if (!actor) return null;
  const input = settingsPatchSchema.parse(req.body);
  const merged = normalizeStoreSettings({
    ...(await publicStoreSettings()),
    ...input.settings,
  });

  await prisma.$transaction(async (tx) => {
    for (const key of adminSettingsKeys) {
      const value = merged[key];
      await tx.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "settings.update",
        entityType: "StoreSetting",
        entityId: "global",
        metadata: { keys: Object.keys(input.settings) },
        ip: req.ip,
      },
    });
  });

  return merged;
}
