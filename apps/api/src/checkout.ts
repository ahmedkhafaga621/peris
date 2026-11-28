import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { findActiveCart, HttpError } from "./cart.js";
import {
  priceCartCoupon,
  recordCouponRedemption,
  type PricedCoupon,
} from "./coupons.js";
import { prisma } from "./db.js";
import { fulfillmentLabel } from "./fulfillment.js";
import { sendOrderConfirmed } from "./mail/index.js";
import {
  listPaymentMethods,
  releaseZiinaPayment,
  CARD_MINIMUM_FILS,
  ziinaConfigured,
  ziinaProvider,
} from "./payments/index.js";
import { readAccess } from "./session.js";
import { readStoreShippingEnabled, readStoreVatRate } from "./settings.js";
import { houseClosed } from "./staff.js";

export const placeOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(30),
  customerName: z.string().min(2).max(120),
  addressLine: z.string().min(4).max(240),
  city: z.string().min(2).max(80),
  paymentMethod: z.enum(["cod", "ziina"]).default("cod"),
});

type CheckoutLine = {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  color: string;
  size: string;
  fabric: string;
  lengthLabel: string;
  quantity: number;
  unitPriceFils: number;
};

export async function quoteCheckout(req: Request, res: Response, city: string) {
  await ensureCheckoutAvailable();
  const lines = await checkoutLines(req, res);
  if (lines.length === 0) throw new HttpError(400, "The bag is empty.");
  const cart = await findActiveCart(req, res);
  return {
    lines: publicLines(lines),
    ...(await totalsFor(city, lines, "cod", cart?.id)),
    ...listPaymentMethods(),
  };
}

export async function placeCheckout(
  req: Request,
  res: Response,
  input: z.infer<typeof placeOrderSchema>,
) {
  const email = input.email.toLowerCase();
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { payments: true },
  });
  if (existing) {
    const presented = await sameOrder(existing.id, email);
    const payment = existing.payments[0];
    return {
      order: presented,
      paymentId: payment?.id ?? null,
      checkoutUrl: null as string | null,
    };
  }

  await ensureCheckoutAvailable();
  const method = input.paymentMethod;
  if (method === "ziina" && !ziinaConfigured()) {
    throw new HttpError(503, "Card payment is not connected.");
  }

  const lines = await checkoutLines(req, res);
  if (lines.length === 0) throw new HttpError(400, "The bag is empty.");
  const claims = readAccess(req);
  const cart = await findActiveCart(req, res);
  const priced = await totalsFor(input.city, lines, method, cart?.id);
  if (method === "ziina" && priced.totalFils < CARD_MINIMUM_FILS) {
    throw new HttpError(
      400,
      "Card payments start at 2 AED. Choose cash on delivery, or add another piece.",
    );
  }
  const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";

  try {
    const created = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx);
      for (const line of lines) {
        const variant = await tx.productVariant.findUnique({
          where: { id: line.variantId },
        });
        const available = variant
          ? variant.stockOnHand - variant.stockReserved
          : 0;
        if (!variant || available < line.quantity) {
          throw new HttpError(
            409,
            available < 1
              ? `${line.name} is out of stock.`
              : `Only ${available} of ${line.name} are available.`,
          );
        }
        if (method === "cod") {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stockOnHand: { decrement: line.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              variantId: variant.id,
              type: "COMMIT",
              quantityDelta: -line.quantity,
              reason: `Cash on delivery ${number}`,
            },
          });
        } else {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stockReserved: { increment: line.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              variantId: variant.id,
              type: "RESERVE",
              quantityDelta: line.quantity,
              reason: `Ziina hold ${number}`,
            },
          });
        }
      }

      const order = await tx.order.create({
        data: {
          number,
          userId: claims?.sub,
          email,
          phone: input.phone.trim(),
          customerName: input.customerName.trim(),
          status: method === "cod" ? "CONFIRMED" : "AWAITING_PAYMENT",
          paymentStatus: method === "cod" ? "UNPAID" : "PENDING",
          subtotalFils: priced.subtotalFils,
          discountFils: priced.discountFils,
          shippingFils: priced.shippingFils,
          vatFils: priced.vatFils,
          totalFils: priced.totalFils,
          pricesIncludeVat: true,
          idempotencyKey: input.idempotencyKey,
          addressLine: `${input.addressLine.trim()}, ${input.city.trim()}`,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              sku: line.sku,
              color: line.color,
              size: line.size,
              fabric: line.fabric,
              lengthLabel: line.lengthLabel,
              quantity: line.quantity,
              unitPriceFils: line.unitPriceFils,
              lineTotalFils: line.unitPriceFils * line.quantity,
            })),
          },
          events: {
            create: {
              status: method === "cod" ? "CONFIRMED" : "AWAITING_PAYMENT",
              note:
                method === "cod"
                  ? "Cash on delivery. Payment stays unpaid until the courier collects."
                  : "Awaiting card payment through Ziina.",
            },
          },
          payments: {
            create: {
              provider: method,
              method,
              amountFils: priced.totalFils,
              status: method === "cod" ? "UNPAID" : "PENDING",
            },
          },
        },
        include: { payments: true },
      });
      if (priced.coupon) {
        await recordCouponRedemption(
          tx,
          order.id,
          claims?.sub,
          priced.coupon.code,
        );
      }
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { couponCode: null },
        });
      }
      return order;
    });

    const payment = created.payments[0];
    let checkoutUrl: string | null = null;

    if (method === "ziina" && payment) {
      const successUrl = `${origin}/checkout/confirmation?number=${encodeURIComponent(created.number)}&email=${encodeURIComponent(email)}&payment=${encodeURIComponent(payment.id)}`;
      const cancelUrl = `${origin}/checkout?cancelled=1`;
      try {
        const session = await ziinaProvider.createPayment({
          paymentId: payment.id,
          orderNumber: created.number,
          amountFils: created.totalFils,
          customerEmail: email,
          successUrl,
          cancelUrl,
        });
        await prisma.payment.update({
          where: { id: payment.id },
          data: { providerRef: session.providerRef },
        });
        checkoutUrl = session.redirectUrl ?? null;
      } catch (error) {
        await releaseZiinaPayment(
          payment.id,
          "Card payment could not be started. The hold was released.",
          {
            eventId: `ziina-create-fail:${payment.id}`,
            payload: {
              source: "create-payment",
              message: error instanceof Error ? error.message : "unknown",
            },
          },
        );
        throw error;
      }
    }

    if (method === "cod") {
      await sendOrderConfirmed({
        to: email,
        customerName: created.customerName,
        number: created.number,
        totalFils: created.totalFils,
        paymentMethod: "cod",
      });
    }

    return {
      order: await presentOrder(created.id),
      paymentId: payment?.id ?? null,
      checkoutUrl,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { payments: true },
      });
      if (raced) {
        return {
          order: await sameOrder(raced.id, email),
          paymentId: raced.payments[0]?.id ?? null,
          checkoutUrl: null as string | null,
        };
      }
    }
    throw error;
  }
}

export async function trackOrder(number: string, email: string) {
  const order = await prisma.order.findUnique({
    where: { number: number.trim() },
  });
  if (!order || order.email !== email.trim().toLowerCase()) {
    throw new HttpError(404, "No order matches that number and email.");
  }
  return presentOrder(order.id);
}

export async function listAccountOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return orders.map((order) => ({
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalFils: order.totalFils,
    createdAt: order.createdAt,
    paid: order.paymentStatus === "PAID",
  }));
}

async function sameOrder(id: string, email: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id } });
  if (order.email !== email)
    throw new HttpError(409, "This checkout was already used.");
  return presentOrder(id);
}

async function ensureCheckoutAvailable() {
  if (await houseClosed())
    throw new HttpError(409, "The house is briefly closed.");
  if (!(await readStoreShippingEnabled()))
    throw new HttpError(409, "Shipping is temporarily unavailable.");
}

async function checkoutLines(req: Request, res: Response) {
  if (req.headers.authorization && !readAccess(req))
    throw new HttpError(401, "Sign in again to continue.");
  const cart = await findActiveCart(req, res);
  if (!cart) return [];
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      variant: {
        include: { color: true, size: true, fabric: true, product: true },
      },
    },
  });
  const lengths = await prisma.lengthOption.findMany({
    where: {
      id: {
        in: items.flatMap((item) =>
          item.lengthOptionId ? [item.lengthOptionId] : [],
        ),
      },
    },
  });
  return items.map((item) => {
    const length = lengths.find((option) => option.id === item.lengthOptionId);
    const product = item.variant.product;
    if (!product.isPublished)
      throw new HttpError(400, `${product.name} is no longer available.`);
    return {
      productId: product.id,
      variantId: item.variant.id,
      name: product.name,
      sku: item.variant.sku,
      color: item.variant.color.name,
      size: item.variant.size.code,
      fabric: item.variant.fabric.name,
      lengthLabel: length ? `${length.inches} in` : "",
      quantity: item.quantity,
      unitPriceFils: item.variant.priceFils ?? product.basePriceFils,
    } satisfies CheckoutLine;
  });
}

async function totalsFor(
  city: string,
  lines: CheckoutLine[],
  paymentMethod: "cod" | "ziina" = "cod",
  cartId?: string | null,
) {
  const zone = await prisma.shippingZone.findFirst({
    where: {
      isActive: true,
      emirate: { equals: city.trim(), mode: "insensitive" },
    },
    include: {
      rates: { where: { isActive: true }, include: { method: true } },
    },
  });
  const rate = zone?.rates.find((item) => {
    if (!item.method.isActive) return false;
    if (paymentMethod === "cod") return item.method.codAllowed;
    return true;
  });
  if (!zone || !rate)
    throw new HttpError(
      400,
      paymentMethod === "cod"
        ? "Cash on delivery is only configured for Dubai right now."
        : "Delivery is only configured for Dubai right now.",
    );
  const subtotalFils = lines.reduce(
    (sum, line) => sum + line.unitPriceFils * line.quantity,
    0,
  );
  const coupon = await priceCartCoupon(cartId, subtotalFils);
  const discountFils = coupon?.discountFils ?? 0;
  let shippingFils =
    rate.freeOverFils != null && subtotalFils >= rate.freeOverFils
      ? 0
      : rate.priceFils;
  if (coupon?.freeShipping) shippingFils = 0;
  const totalFils = Math.max(0, subtotalFils - discountFils) + shippingFils;
  const vat = await readStoreVatRate();
  return {
    subtotalFils,
    discountFils,
    shippingFils,
    vatFils: includedVat(totalFils, vat),
    totalFils,
    pricesIncludeVat: true,
    coupon: coupon ? presentCoupon(coupon) : null,
    shipping: {
      code: rate.method.code,
      name: rate.method.name,
      estimatedMinDays: rate.method.estimatedMinDays,
      estimatedMaxDays: rate.method.estimatedMaxDays,
    },
    paymentMethod,
    paid: false as const,
  };
}

function presentCoupon(coupon: PricedCoupon) {
  return {
    code: coupon.code,
    type: coupon.type,
    discountFils: coupon.discountFils,
    freeShipping: coupon.freeShipping,
  };
}

function includedVat(totalFils: number, rate: number) {
  if (rate <= 0) return 0;
  return totalFils - Math.round(totalFils / (1 + rate));
}

function publicLines(lines: CheckoutLine[]) {
  return lines.map(
    ({ name, color, size, lengthLabel, quantity, unitPriceFils }) => ({
      name,
      color,
      size,
      lengthLabel,
      quantity,
      unitPriceFils,
      lineTotalFils: unitPriceFils * quantity,
    }),
  );
}

async function nextNumber(tx: Prisma.TransactionClient) {
  const latest = await tx.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const current = latest?.number.startsWith("PR-")
    ? Number(latest.number.slice(3))
    : 10000;
  const sequence = Number.isFinite(current) ? current : 10000;
  return `PR-${sequence + 1}`;
}

async function presentOrder(id: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const shipment = order.shipments[0];
  const payment = order.payments[0];
  return {
    number: order.number,
    email: order.email,
    customerName: order.customerName,
    status: order.status,
    statusLabel: fulfillmentLabel[order.status],
    trackingNumber: shipment?.trackingNumber ?? null,
    trackingUrl: shipment?.trackingUrl ?? null,
    carrier: shipment?.carrier ?? null,
    paymentStatus: order.paymentStatus,
    paymentId: payment?.id ?? null,
    subtotalFils: order.subtotalFils,
    discountFils: order.discountFils,
    shippingFils: order.shippingFils,
    vatFils: order.vatFils,
    totalFils: order.totalFils,
    currency: order.currency,
    pricesIncludeVat: order.pricesIncludeVat,
    paymentMethod: payment?.method ?? "cod",
    paid: order.paymentStatus === "PAID",
    items: order.items.map((item) => ({
      name: item.name,
      color: item.color,
      size: item.size,
      fabric: item.fabric,
      lengthLabel: item.lengthLabel,
      quantity: item.quantity,
      unitPriceFils: item.unitPriceFils,
      lineTotalFils: item.lineTotalFils,
    })),
  };
}
