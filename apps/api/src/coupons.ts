import type { Coupon, CouponType, Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { findActiveCart, HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { requireStaff } from "./staff.js";

const codeSchema = z.object({
  code: z.string().trim().min(2).max(40),
});

const staffCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphen, or underscore."),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  amount: z.number().int().min(0).max(100_000_000),
  minSubtotalFils: z.number().int().min(0).max(100_000_000).default(0),
  isActive: z.boolean().default(true),
});

export type PricedCoupon = {
  code: string;
  type: CouponType;
  discountFils: number;
  freeShipping: boolean;
};

export async function applyCartCoupon(req: Request, res: Response) {
  const input = codeSchema.parse(req.body);
  const cart = await findActiveCart(req, res);
  if (!cart) throw new HttpError(400, "Add a piece before applying a code.");
  return applyToCart(cart.id, input.code);
}

export async function removeCartCoupon(req: Request, res: Response) {
  const cart = await findActiveCart(req, res);
  if (!cart) return { coupon: null };
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: null },
  });
  return { coupon: null };
}

export async function readCartCoupon(req: Request, res: Response) {
  const cart = await findActiveCart(req, res);
  if (!cart?.couponCode) return { coupon: null };
  const subtotal = await cartSubtotal(cart.id);
  try {
    const priced = await priceCoupon(cart.couponCode, subtotal);
    return { coupon: presentPriced(priced) };
  } catch {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null },
    });
    return { coupon: null };
  }
}

async function applyToCart(cartId: string, code: string) {
  const subtotal = await cartSubtotal(cartId);
  if (subtotal <= 0) throw new HttpError(400, "Add a piece before applying a code.");
  const priced = await priceCoupon(code, subtotal);
  await prisma.cart.update({
    where: { id: cartId },
    data: { couponCode: priced.code },
  });
  return { coupon: presentPriced(priced) };
}

export async function priceCartCoupon(
  cartId: string | null | undefined,
  subtotalFils: number,
): Promise<PricedCoupon | null> {
  if (!cartId) return null;
  const cart = await prisma.cart.findUnique({ where: { id: cartId } });
  if (!cart?.couponCode) return null;
  try {
    return await priceCoupon(cart.couponCode, subtotalFils);
  } catch {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null },
    });
    return null;
  }
}

export async function priceCoupon(
  rawCode: string,
  subtotalFils: number,
): Promise<PricedCoupon> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new HttpError(400, "That code is not valid.");
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new HttpError(400, "That code is not valid yet.");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new HttpError(400, "That code has ended.");
  }
  if (subtotalFils < coupon.minSubtotalFils) {
    throw new HttpError(
      400,
      `That code needs a bag of at least AED ${Math.round(coupon.minSubtotalFils / 100)}.`,
    );
  }
  if (coupon.usageLimit != null) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id },
    });
    if (used >= coupon.usageLimit) {
      throw new HttpError(400, "That code has been fully used.");
    }
  }
  return {
    code: coupon.code,
    type: coupon.type,
    discountFils: discountFor(coupon, subtotalFils),
    freeShipping: coupon.type === "FREE_SHIPPING",
  };
}

function discountFor(coupon: Coupon, subtotalFils: number) {
  if (coupon.type === "PERCENT") {
    const percent = Math.min(100, Math.max(0, coupon.amount));
    return Math.min(subtotalFils, Math.round((subtotalFils * percent) / 100));
  }
  if (coupon.type === "FIXED") {
    return Math.min(subtotalFils, Math.max(0, coupon.amount));
  }
  return 0;
}

function presentPriced(priced: PricedCoupon) {
  return {
    code: priced.code,
    type: priced.type,
    discountFils: priced.discountFils,
    freeShipping: priced.freeShipping,
  };
}

async function cartSubtotal(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { variant: { include: { product: true } } },
  });
  return items.reduce((sum, item) => {
    const unit = item.variant.priceFils ?? item.variant.product.basePriceFils;
    return sum + unit * item.quantity;
  }, 0);
}

export async function staffCoupons(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "marketing.write");
  if (!actor) return null;
  const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });
  return coupons.map(presentStaffCoupon);
}

export async function createStaffCoupon(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "marketing.write");
  if (!actor) return null;
  const input = staffCouponSchema.parse(req.body);
  if (input.type === "PERCENT" && input.amount > 100) {
    throw new HttpError(400, "A percent code cannot exceed 100.");
  }
  if (input.type === "FIXED" && input.amount % 100 !== 0) {
    throw new HttpError(400, "Enter a fixed discount in whole dirhams.");
  }
  const code = input.code.toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new HttpError(409, "That code is already on the desk.");
  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: input.type,
      amount: input.type === "FREE_SHIPPING" ? 0 : input.amount,
      minSubtotalFils: input.minSubtotalFils,
      isActive: input.isActive,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "coupon.create",
      entityType: "Coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code, type: coupon.type },
      ip: req.ip,
    },
  });
  return presentStaffCoupon(coupon);
}

export async function updateStaffCoupon(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "marketing.write");
  if (!actor) return null;
  const input = z
    .object({
      isActive: z.boolean().optional(),
      minSubtotalFils: z.number().int().min(0).max(100_000_000).optional(),
    })
    .parse(req.body);
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That code is not on the desk.");
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      isActive: input.isActive ?? existing.isActive,
      minSubtotalFils: input.minSubtotalFils ?? existing.minSubtotalFils,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "coupon.update",
      entityType: "Coupon",
      entityId: coupon.id,
      metadata: {
        code: coupon.code,
        isActive: coupon.isActive,
        minSubtotalFils: coupon.minSubtotalFils,
      },
      ip: req.ip,
    },
  });
  return presentStaffCoupon(coupon);
}

function presentStaffCoupon(coupon: Coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    amount: coupon.amount,
    minSubtotalFils: coupon.minSubtotalFils,
    isActive: coupon.isActive,
  };
}

export async function recordCouponRedemption(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string | undefined,
  code: string | null | undefined,
) {
  if (!code) return;
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) return;
  await tx.couponRedemption.create({
    data: {
      couponId: coupon.id,
      orderId,
      userId: userId ?? null,
    },
  });
}
