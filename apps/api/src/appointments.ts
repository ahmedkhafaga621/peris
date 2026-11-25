import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { requireStaff } from "./staff.js";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(40),
  preferredAt: z.string().trim().min(3).max(80),
  kind: z.enum(["fitting", "consultation"]),
});

const appointmentStatusSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

const kindLabel: Record<string, string> = {
  fitting: "Fitting",
  consultation: "Design consultation",
};

export async function requestAppointment(req: Request) {
  const input = requestSchema.parse(req.body);
  const visit = await prisma.appointment.create({
    data: {
      name: input.name,
      phone: input.phone,
      preferredAt: input.preferredAt,
      kind: input.kind,
    },
  });
  return { id: visit.id, status: visit.status };
}

export async function staffAppointments(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "customers.write");
  if (!actor) return null;
  const rows = await prisma.appointment.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    preferredAt: row.preferredAt,
    kind: kindLabel[row.kind] ?? row.kind,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function updateStaffAppointment(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "customers.write");
  if (!actor) return null;
  const input = appointmentStatusSchema.parse(req.body);
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing)
    throw new HttpError(404, "That appointment is not on the desk.");
  if (existing.status === input.status) return presentAppointment(existing);

  const row = await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: input.status },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "appointment.status",
      entityType: "Appointment",
      entityId: row.id,
      metadata: { fromStatus: existing.status, toStatus: row.status },
      ip: req.ip,
    },
  });
  return presentAppointment(row);
}

function presentAppointment(row: {
  id: string;
  name: string;
  phone: string;
  preferredAt: string;
  kind: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    preferredAt: row.preferredAt,
    kind: kindLabel[row.kind] ?? row.kind,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
