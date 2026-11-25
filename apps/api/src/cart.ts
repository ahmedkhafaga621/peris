import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { readAccess, readCookie } from "./session.js";

const guestCookie = "peris_guest";

const lineSchema = z.object({
  productId: z.string().min(1),
  color: z.string().min(1),
  size: z.string().min(1),
  lengthInches: z.number().int(),
  quantity: z.number().int().min(1).max(8),
});

export const cartBodySchema = z.object({
  lines: z.array(lineSchema).max(30),
});

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type ResolvedLine = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  color: string;
  size: string;
  lengthInches: number;
  lengthOptionId: string;
  variantId: string;
  quantity: number;
  unitPriceFils: number;
};

export async function readCart(req: Request, res: Response) {
  const cart = await cartForRequest(req, res, false);
  if (!cart) return [];
  return presentCart(cart.id);
}

export async function findActiveCart(req: Request, res: Response) {
  return cartForRequest(req, res, false);
}

export async function replaceCart(req: Request, res: Response, lines: z.infer<typeof lineSchema>[]) {
  const cart = await cartForRequest(req, res, true);
  if (!cart) throw new HttpError(401, "Sign in again to continue.");
  const resolved = await resolveLines(lines);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.createMany({
    data: resolved.map((line) => ({
      cartId: cart.id,
      variantId: line.variantId,
      lengthOptionId: line.lengthOptionId,
      quantity: line.quantity,
    })),
  });
  return presentCart(cart.id);
}

export async function mergeCart(userId: string, req: Request, res: Response, lines: z.infer<typeof lineSchema>[]) {
  const resolved = await resolveLines(lines);
  const cart = await userCart(userId);
  const current = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
  for (const line of resolved) {
    const match = current.find((item) => item.variantId === line.variantId && item.lengthOptionId === line.lengthOptionId);
    if (match) {
      const quantity = Math.min(8, match.quantity + line.quantity);
      await assertStock(line.variantId, quantity, line.name);
      await prisma.cartItem.update({ where: { id: match.id }, data: { quantity } });
      match.quantity = quantity;
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, variantId: line.variantId, lengthOptionId: line.lengthOptionId, quantity: line.quantity },
      });
    }
  }
  const guest = readCookie(req, guestCookie);
  if (guest) {
    await prisma.cart.deleteMany({ where: { guestToken: guest } });
    clearGuestCookie(res);
  }
  return presentCart(cart.id);
}

async function cartForRequest(req: Request, res: Response, create: boolean) {
  if (req.headers.authorization) {
    const claims = readAccess(req);
    if (!claims) {
      if (!create) return null;
      throw new HttpError(401, "Sign in again to continue.");
    }
    return userCart(claims.sub);
  }
  return guestCart(req, res, create);
}

async function userCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

function guestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

function clearGuestCookie(res: Response) {
  res.clearCookie(guestCookie, { path: "/api/v1", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.clearCookie(guestCookie, { path: "/api/v1/cart", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

async function guestCart(req: Request, res: Response, create: boolean) {
  const token = readCookie(req, guestCookie);
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { guestToken: token } });
    if (existing) {
      res.cookie(guestCookie, token, guestCookieOptions());
      return existing;
    }
  }
  if (!create) return null;
  const guestToken = randomBytes(24).toString("base64url");
  res.cookie(guestCookie, guestToken, guestCookieOptions());
  return prisma.cart.create({ data: { guestToken } });
}

async function resolveLines(lines: z.infer<typeof lineSchema>[]) {
  const grouped = new Map<string, z.infer<typeof lineSchema>>();
  for (const line of lines) {
    const key = `${line.productId}|${line.color}|${line.size}|${line.lengthInches}`;
    const existing = grouped.get(key);
    grouped.set(key, existing ? { ...line, quantity: Math.min(8, existing.quantity + line.quantity) } : line);
  }

  const resolved: ResolvedLine[] = [];
  for (const line of grouped.values()) {
    const product = await prisma.product.findFirst({
      where: { id: line.productId, isPublished: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    const color = await prisma.color.findUnique({ where: { name: line.color } });
    const size = await prisma.size.findUnique({ where: { code: line.size } });
    const length = await prisma.lengthOption.findUnique({ where: { inches: line.lengthInches } });
    if (!product || !color || !size || !length) {
      throw new HttpError(400, "A piece in the bag is no longer available. Remove it and choose again.");
    }
    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id, colorId: color.id, sizeId: size.id, isActive: true },
    });
    const variant = variants.sort((a, b) => b.stockOnHand - b.stockReserved - (a.stockOnHand - a.stockReserved))[0];
    if (!variant) throw new HttpError(400, `${product.name} is not available in ${line.color}, size ${line.size}.`);
    await assertStock(variant.id, line.quantity, product.name);
    resolved.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url ?? "",
      color: color.name,
      size: size.code,
      lengthInches: length.inches,
      lengthOptionId: length.id,
      variantId: variant.id,
      quantity: line.quantity,
      unitPriceFils: variant.priceFils ?? product.basePriceFils,
    });
  }
  return resolved;
}

async function assertStock(variantId: string, quantity: number, name: string) {
  const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  const available = variant.stockOnHand - variant.stockReserved;
  if (quantity > available) {
    throw new HttpError(409, available < 1 ? `${name} is out of stock.` : `Only ${available} of ${name} are available.`);
  }
}

async function presentCart(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      variant: {
        include: {
          color: true,
          size: true,
          product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
        },
      },
    },
  });
  const lengths = await prisma.lengthOption.findMany({
    where: { id: { in: items.flatMap((item) => (item.lengthOptionId ? [item.lengthOptionId] : [])) } },
  });
  return items.map((item) => {
    const length = lengths.find((option) => option.id === item.lengthOptionId);
    const product = item.variant.product;
    const lengthInches = length?.inches ?? 0;
    return {
      id: `${product.id}|${item.variant.color.name}|${item.variant.size.code}|${lengthInches}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url ?? "",
      color: item.variant.color.name,
      size: item.variant.size.code,
      lengthInches,
      quantity: item.quantity,
      unitPriceFils: item.variant.priceFils ?? product.basePriceFils,
    };
  });
}
