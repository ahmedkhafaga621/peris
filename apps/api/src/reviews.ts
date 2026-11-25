import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { requireCustomer } from "./session.js";
import { requireStaff } from "./staff.js";

const noteSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(8).max(2000),
});

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function publishedReviews(slug?: string) {
  const rows = await prisma.review.findMany({
    where: {
      status: "APPROVED",
      ...(slug ? { product: { slug, isPublished: true } } : { product: { isPublished: true } }),
    },
    include: { user: true, product: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return rows.map(presentPublicReview);
}

export async function leaveReview(req: Request, res: Response, slug: string) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const input = noteSchema.parse(req.body);
  const product = await prisma.product.findFirst({ where: { slug, isPublished: true } });
  if (!product) throw new HttpError(404, "This piece is not published.");
  const open = await prisma.review.findFirst({
    where: { userId, productId: product.id, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (open) throw new HttpError(409, "A note for this piece is already with the desk.");
  const row = await prisma.review.create({
    data: { userId, productId: product.id, rating: input.rating, body: input.body, status: "PENDING" },
  });
  return { id: row.id };
}

export async function staffReviews(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "reviews.moderate");
  if (!actor) return null;
  const rows = await prisma.review.findMany({
    include: { user: true, product: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(presentStaffReview);
}

export async function updateStaffReview(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "reviews.moderate");
  if (!actor) return null;
  const input = decisionSchema.parse(req.body);
  const existing = await prisma.review.findUnique({ where: { id }, include: { user: true, product: true } });
  if (!existing) throw new HttpError(404, "That note is not on the desk.");
  if (existing.status === input.status) return presentStaffReview(existing);
  const row = await prisma.review.update({
    where: { id: existing.id },
    data: { status: input.status },
    include: { user: true, product: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "review.note",
      entityType: "Review",
      entityId: row.id,
      metadata: { name: row.user.firstName, slug: row.product.slug, toStatus: row.status },
      ip: req.ip,
    },
  });
  return presentStaffReview(row);
}

function presentPublicReview(row: {
  id: string;
  body: string;
  rating: number;
  user: { firstName: string };
  product: { name: string; slug: string };
}) {
  return {
    id: row.id,
    body: row.body,
    rating: row.rating,
    name: row.user.firstName,
    productName: row.product.name,
    productSlug: row.product.slug,
  };
}

function presentStaffReview(row: {
  id: string;
  body: string;
  rating: number;
  status: string;
  createdAt: Date;
  user: { firstName: string; lastName: string };
  product: { name: string; slug: string };
}) {
  return {
    id: row.id,
    body: row.body,
    rating: row.rating,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    name: `${row.user.firstName} ${row.user.lastName}`,
    productName: row.product.name,
    productSlug: row.product.slug,
  };
}
