import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { requireCustomer } from "./session.js";

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  street: z.string().trim().min(4).max(160),
  building: z.string().trim().max(80).optional(),
  apartment: z.string().trim().max(40).optional(),
});

export async function listAddresses(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const rows = await prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] });
  return rows.map(presentAddress);
}

export async function createAddress(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const input = addressSchema.parse(req.body);
  const existing = await prisma.address.count({ where: { userId } });
  const row = await prisma.address.create({
    data: {
      userId,
      fullName: input.fullName,
      phone: input.phone,
      country: "AE",
      emirate: "Dubai",
      city: "Dubai",
      street: input.street,
      building: blank(input.building),
      apartment: blank(input.apartment),
      isDefault: existing === 0,
    },
  });
  return presentAddress(row);
}

export async function deleteAddress(req: Request, res: Response, id: string) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const row = await prisma.address.findUnique({ where: { id } });
  if (!row || row.userId !== userId) throw new HttpError(404, "That address is not on this account.");
  await prisma.address.delete({ where: { id: row.id } });
  if (row.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { id: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return { ok: true };
}

function presentAddress(row: {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  street: string;
  building: string | null;
  apartment: string | null;
  isDefault: boolean;
}) {
  const line = [row.street, row.building, row.apartment].filter((part) => part && part.trim().length > 0).join(", ");
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    city: row.city,
    street: row.street,
    building: row.building,
    apartment: row.apartment,
    line,
    isDefault: row.isDefault,
  };
}

function blank(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
