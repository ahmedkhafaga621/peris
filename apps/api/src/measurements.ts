import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { requireCustomer } from "./session.js";

const centimetre = z.number().min(30).max(250);
const length = z.union([z.literal(50), z.literal(52), z.literal(54), z.literal(56), z.literal(58), z.literal(60)]);

const measurementSchema = z
  .object({
    label: z.string().trim().min(2).max(40),
    heightCm: centimetre.optional(),
    shoulderCm: centimetre.optional(),
    sleeveCm: centimetre.optional(),
    chestCm: centimetre.optional(),
    waistCm: centimetre.optional(),
    abayaLengthIn: length.optional(),
    notes: z.string().trim().max(240).optional(),
  })
  .refine(
    (value) =>
      value.heightCm !== undefined ||
      value.shoulderCm !== undefined ||
      value.sleeveCm !== undefined ||
      value.chestCm !== undefined ||
      value.waistCm !== undefined ||
      value.abayaLengthIn !== undefined,
    { message: "Add at least one measurement." },
  );

export async function listMeasurements(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const rows = await prisma.measurementProfile.findMany({ where: { userId }, orderBy: { id: "asc" } });
  return rows.map(presentMeasurement);
}

export async function createMeasurement(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const input = measurementSchema.parse(req.body);
  const row = await prisma.measurementProfile.create({
    data: {
      userId,
      label: input.label,
      heightCm: input.heightCm,
      shoulderCm: input.shoulderCm,
      sleeveCm: input.sleeveCm,
      chestCm: input.chestCm,
      waistCm: input.waistCm,
      abayaLengthIn: input.abayaLengthIn,
      notes: input.notes?.trim() || null,
    },
  });
  return presentMeasurement(row);
}

export async function deleteMeasurement(req: Request, res: Response, id: string) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const row = await prisma.measurementProfile.findUnique({ where: { id } });
  if (!row || row.userId !== userId) throw new HttpError(404, "That measurement is not on this account.");
  await prisma.measurementProfile.delete({ where: { id: row.id } });
  return { ok: true };
}

function presentMeasurement(row: {
  id: string;
  label: string;
  heightCm: unknown;
  shoulderCm: unknown;
  sleeveCm: unknown;
  chestCm: unknown;
  waistCm: unknown;
  abayaLengthIn: number | null;
  notes: string | null;
}) {
  return {
    id: row.id,
    label: row.label,
    heightCm: centimetres(row.heightCm),
    shoulderCm: centimetres(row.shoulderCm),
    sleeveCm: centimetres(row.sleeveCm),
    chestCm: centimetres(row.chestCm),
    waistCm: centimetres(row.waistCm),
    abayaLengthIn: row.abayaLengthIn,
    notes: row.notes,
  };
}

function centimetres(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
