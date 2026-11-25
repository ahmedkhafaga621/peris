import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { requireStaff } from "./staff.js";

const messageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(8).max(40),
  message: z.string().trim().min(8).max(2000),
});

const messageStatusSchema = z.object({
  status: z.enum(["NEW", "HANDLED"]),
});

export async function sendContactMessage(req: Request) {
  const input = messageSchema.parse(req.body);
  const row = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      message: input.message,
    },
  });
  return { id: row.id };
}

export async function staffMessages(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "customers.write");
  if (!actor) return null;
  const rows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(presentStaffMessage);
}

export async function updateStaffMessage(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "customers.write");
  if (!actor) return null;
  const input = messageStatusSchema.parse(req.body);
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That message is not on the desk.");
  if (existing.status === input.status) return presentStaffMessage(existing);

  const row = await prisma.contactMessage.update({
    where: { id: existing.id },
    data: { status: input.status },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "contactMessage.status",
      entityType: "ContactMessage",
      entityId: row.id,
      metadata: { fromStatus: existing.status, toStatus: row.status },
      ip: req.ip,
    },
  });
  return presentStaffMessage(row);
}

function presentStaffMessage(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
