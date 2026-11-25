import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { HttpError } from "../cart.js";
import { prisma } from "../db.js";
import { sendOrderConfirmed } from "../mail/index.js";
import { releaseZiinaPayment } from "./release.js";
import {
  fetchZiinaPaymentIntent,
  verifyZiinaWebhook,
  ziinaConfigured,
  ziinaProvider,
} from "./ziina.js";

export { ziinaConfigured };
export {
  releaseExpiredReservations,
  releaseZiinaPayment,
  reservationCutoff,
  reservationMinutes,
} from "./release.js";

export function listPaymentMethods() {
  const methods: Array<"cod" | "ziina"> = ["cod"];
  if (ziinaConfigured()) methods.push("ziina");
  return { methods };
}

export async function paymentStatus(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!payment) throw new HttpError(404, "That payment was not found.");

  if (
    payment.provider === "ziina" &&
    payment.status === "PENDING" &&
    payment.providerRef &&
    ziinaConfigured()
  ) {
    try {
      const intent = await fetchZiinaPaymentIntent(payment.providerRef);
      if (intent.status === "completed") {
        await markZiinaPaid(payment.id, payment.providerRef, {
          eventId: `ziina-poll:${payment.providerRef}:completed`,
          payload: { source: "status-poll", intent },
        });
      } else if (
        intent.status === "failed" ||
        intent.status === "canceled"
      ) {
        await releaseZiinaPayment(
          payment.id,
          intent.status === "canceled"
            ? "Card payment was cancelled. The hold was released."
            : "Card payment failed. The hold was released.",
          {
            eventId: `ziina-poll:${payment.providerRef}:${intent.status}`,
            payload: { source: "status-poll", intent },
          },
        );
      }
      const refreshed = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: { order: true },
      });
      return presentPayment(refreshed);
    } catch {
      // Keep the local pending status if Ziina cannot be reached.
    }
  }

  return presentPayment(payment);
}

function presentPayment(payment: {
  id: string;
  status: string;
  method: string;
  order: { number: string; status: string; paymentStatus: string };
}) {
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    paid: payment.status === "PAID",
    orderNumber: payment.order.number,
    orderStatus: payment.order.status,
    paymentStatus: payment.order.paymentStatus,
  };
}

export async function handleZiinaWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : "");
  const verified = verifyZiinaWebhook(
    rawBody,
    req.header("x-hmac-signature") ?? undefined,
  );

  if ((!verified.paid && !verified.failed) || !verified.intentId) {
    res.json({ received: true, ignored: true });
    return;
  }

  const existing = await prisma.paymentEvent.findUnique({
    where: { eventId: verified.eventId },
  });
  if (existing) {
    res.json({ received: true, duplicate: true });
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { provider: "ziina", providerRef: verified.intentId },
  });
  if (!payment) {
    throw new HttpError(404, "That Ziina payment was not found.");
  }

  if (verified.failed) {
    const result = await releaseZiinaPayment(
      payment.id,
      verified.status === "canceled"
        ? "Card payment was cancelled. The hold was released."
        : "Card payment failed. The hold was released.",
      {
        eventId: verified.eventId,
        payload: {
          type: verified.type,
          intentId: verified.intentId,
          status: verified.status,
          amountFils: verified.amountFils,
        },
      },
    );
    res.json({ received: true, released: result.released });
    return;
  }

  await markZiinaPaid(payment.id, verified.intentId, {
    eventId: verified.eventId,
    payload: {
      type: verified.type,
      intentId: verified.intentId,
      amountFils: verified.amountFils,
    },
  });

  res.json({ received: true, paid: true });
}

async function markZiinaPaid(
  paymentId: string,
  intentId: string,
  event: { eventId: string; payload: Prisma.InputJsonValue },
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } } },
  });
  if (!payment || payment.provider !== "ziina") {
    throw new HttpError(404, "That Ziina payment was not found.");
  }

  const already = await prisma.paymentEvent.findUnique({
    where: { eventId: event.eventId },
  });
  if (already) return;

  if (payment.status === "PAID" || payment.order.paymentStatus === "PAID") {
    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        provider: "ziina",
        eventId: event.eventId,
        payload: { ...asObject(event.payload), duplicatePaid: true },
      },
    });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of payment.order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { sku: item.sku },
        });
        if (!variant) {
          throw new HttpError(409, `${item.name} is no longer in the catalog.`);
        }
        if (variant.stockReserved < item.quantity) {
          throw new HttpError(
            409,
            `Reserved stock for ${item.name} is missing.`,
          );
        }
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stockReserved: { decrement: item.quantity },
            stockOnHand: { decrement: item.quantity },
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            variantId: variant.id,
            type: "COMMIT",
            quantityDelta: -item.quantity,
            reason: `Ziina paid ${payment.order.number}`,
          },
        });
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          providerRef: intentId || payment.providerRef,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "CONFIRMED", paymentStatus: "PAID" },
      });
      await tx.orderEvent.create({
        data: {
          orderId: payment.orderId,
          status: "CONFIRMED",
          note: "Card payment confirmed by Ziina.",
        },
      });
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          provider: "ziina",
          eventId: event.eventId,
          payload: event.payload,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }

  await sendOrderConfirmed({
    to: payment.order.email,
    customerName: payment.order.customerName,
    number: payment.order.number,
    totalFils: payment.order.totalFils,
    paymentMethod: "ziina",
  });
}

function asObject(value: Prisma.InputJsonValue) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export { ziinaProvider };
