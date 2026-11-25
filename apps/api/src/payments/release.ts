import { HttpError } from "../cart.js";
import { prisma } from "../db.js";
import { sendPaymentFailed } from "../mail/index.js";

export const DEFAULT_RESERVATION_MINUTES = 30;

export function reservationCutoff(
  now = new Date(),
  minutes = reservationMinutes(),
) {
  return new Date(now.getTime() - minutes * 60_000);
}

export function reservationMinutes() {
  const raw = Number(process.env.RESERVATION_MINUTES ?? DEFAULT_RESERVATION_MINUTES);
  if (!Number.isFinite(raw) || raw < 1 || raw > 24 * 60) {
    return DEFAULT_RESERVATION_MINUTES;
  }
  return Math.floor(raw);
}

export async function releaseZiinaPayment(
  paymentId: string,
  reason: string,
  event?: { eventId: string; payload?: Record<string, unknown> },
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } } },
  });
  if (!payment || payment.provider !== "ziina") {
    throw new HttpError(404, "That Ziina payment was not found.");
  }
  if (
    payment.status === "PAID" ||
    payment.order.paymentStatus === "PAID" ||
    payment.order.status === "CANCELLED" ||
    payment.status === "FAILED"
  ) {
    if (event) {
      const existing = await prisma.paymentEvent.findUnique({
        where: { eventId: event.eventId },
      });
      if (!existing) {
        await prisma.paymentEvent.create({
          data: {
            paymentId: payment.id,
            provider: "ziina",
            eventId: event.eventId,
            payload: {
              ...(event.payload ?? {}),
              alreadyClosed: true,
              reason,
            },
          },
        });
      }
    }
    return { released: false as const, number: payment.order.number };
  }

  if (event) {
    const existing = await prisma.paymentEvent.findUnique({
      where: { eventId: event.eventId },
    });
    if (existing) return { released: false as const, number: payment.order.number };
  }

  await prisma.$transaction(async (tx) => {
    for (const item of payment.order.items) {
      const variant = await tx.productVariant.findUnique({
        where: { sku: item.sku },
      });
      if (!variant) {
        throw new HttpError(409, `${item.name} is no longer in the catalog.`);
      }
      const releaseQty = Math.min(item.quantity, variant.stockReserved);
      if (releaseQty > 0) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockReserved: { decrement: releaseQty } },
        });
        await tx.inventoryTransaction.create({
          data: {
            variantId: variant.id,
            type: "RELEASE",
            quantityDelta: -releaseQty,
            reason: `${reason} ${payment.order.number}`,
          },
        });
      }
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELLED", paymentStatus: "FAILED" },
    });
    await tx.orderEvent.create({
      data: {
        orderId: payment.orderId,
        status: "CANCELLED",
        note: reason,
      },
    });
    if (event) {
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          provider: "ziina",
          eventId: event.eventId,
          payload: { ...(event.payload ?? {}), reason },
        },
      });
    }
  });

  await sendPaymentFailed({
    to: payment.order.email,
    customerName: payment.order.customerName,
    number: payment.order.number,
    reason,
  });

  return { released: true as const, number: payment.order.number };
}

export async function releaseExpiredReservations(now = new Date()) {
  const cutoff = reservationCutoff(now);
  const stale = await prisma.order.findMany({
    where: {
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      createdAt: { lt: cutoff },
      payments: { some: { provider: "ziina", status: "PENDING" } },
    },
    include: {
      payments: {
        where: { provider: "ziina", status: "PENDING" },
        take: 1,
      },
    },
    take: 50,
  });

  const results: Array<{ number: string; released: boolean }> = [];
  for (const order of stale) {
    const payment = order.payments[0];
    if (!payment) continue;
    const result = await releaseZiinaPayment(
      payment.id,
      "Card payment expired. The hold was released.",
      {
        eventId: `ziina-expire:${payment.id}:${cutoff.toISOString()}`,
        payload: { source: "reservation-pass", cutoff: cutoff.toISOString() },
      },
    );
    results.push({ number: result.number, released: result.released });
  }
  return results;
}
