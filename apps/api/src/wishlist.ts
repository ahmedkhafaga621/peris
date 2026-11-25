import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { requireCustomer } from "./session.js";

const wishlistSchema = z.object({
  productIds: z.array(z.string().trim().min(1).max(40)).max(40),
});

export async function listWishlist(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const wishlist = await ownWishlist(userId);
  return publishedIds(wishlist.items.map((item) => item.productId));
}

export async function replaceWishlist(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const input = wishlistSchema.parse(req.body);
  const ids = await publishedIds([...new Set(input.productIds)]);
  const wishlist = await ownWishlist(userId);
  await prisma.$transaction(async (tx) => {
    await tx.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    if (ids.length > 0) {
      await tx.wishlistItem.createMany({
        data: ids.map((productId) => ({ wishlistId: wishlist.id, productId })),
      });
    }
  });
  return ids;
}

async function ownWishlist(userId: string) {
  return prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

async function publishedIds(ids: string[]) {
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isPublished: true },
    select: { id: true },
  });
  const allowed = new Set(products.map((product) => product.id));
  return ids.filter((id) => allowed.has(id));
}
