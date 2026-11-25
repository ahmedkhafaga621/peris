import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { requireStaff } from "./staff.js";

const subscribeSchema = z.object({
  email: z.string().trim().email().max(180),
});

export async function subscribeNewsletter(req: Request) {
  const email = subscribeSchema.parse(req.body).email.toLowerCase();
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
  return { subscribed: true };
}

export async function staffNewsletter(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "marketing.write");
  if (!actor) return null;
  const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  }));
}
