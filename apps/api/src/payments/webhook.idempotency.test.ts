import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { prisma } from "../db.js";
import { handleZiinaWebhook } from "./index.js";

process.env.DATABASE_URL ??=
  "postgresql://peris:peris@127.0.0.1:5433/peris?schema=public";
process.env.ZIINA_WEBHOOK_SECRET = "desk-webhook-secret";

function signedBody(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = createHmac("sha256", "desk-webhook-secret")
    .update(body)
    .digest("hex");
  return { body, signature };
}

function mockRequest(body: Buffer, signature: string) {
  return {
    body,
    header(name: string) {
      return name.toLowerCase() === "x-hmac-signature" ? signature : undefined;
    },
  } as unknown as Request;
}

function mockResponse() {
  const state: { jsonBody?: unknown } = {};
  const res = {
    state,
    json(body: unknown) {
      state.jsonBody = body;
      return res;
    },
  };
  return res as unknown as Response & { state: { jsonBody?: unknown } };
}

test("duplicate Ziina paid webhook does not commit stock twice", async () => {
  const variant = await prisma.productVariant.findFirst({
    where: { stockOnHand: { gte: 2 } },
    include: { product: true },
    orderBy: { sku: "asc" },
  });
  assert.ok(variant, "seed catalog must include a stocked variant");

  const intentId = `intent-dup-${Date.now()}`;
  const eventId = `op-dup-${Date.now()}`;
  const number = `PR-DUP-${Date.now().toString().slice(-8)}`;

  const beforeReserved = variant.stockReserved;
  const beforeOnHand = variant.stockOnHand;

  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stockReserved: { increment: 1 } },
  });

  const order = await prisma.order.create({
    data: {
      number,
      email: "dupwebhook@example.com",
      phone: "+971501111199",
      customerName: "Dup Webhook",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      subtotalFils: variant.priceFils ?? variant.product.basePriceFils,
      shippingFils: 2500,
      vatFils: 0,
      totalFils: (variant.priceFils ?? variant.product.basePriceFils) + 2500,
      pricesIncludeVat: true,
      idempotencyKey: `dup-${Date.now()}`,
      addressLine: "Boutique M01, Dubai",
      items: {
        create: {
          productId: variant.productId,
          name: variant.product.name,
          sku: variant.sku,
          color: "Black",
          size: "M",
          fabric: "Sample",
          lengthLabel: "56 in",
          quantity: 1,
          unitPriceFils: variant.priceFils ?? variant.product.basePriceFils,
          lineTotalFils: variant.priceFils ?? variant.product.basePriceFils,
        },
      },
      payments: {
        create: {
          provider: "ziina",
          method: "ziina",
          providerRef: intentId,
          amountFils: (variant.priceFils ?? variant.product.basePriceFils) + 2500,
          status: "PENDING",
        },
      },
    },
    include: { payments: true },
  });

  const payload = {
    event: "payment_intent.status.updated",
    data: {
      id: intentId,
      status: "completed",
      operation_id: eventId,
      amount: order.totalFils,
    },
  };
  const { body, signature } = signedBody(payload);

  const first = mockResponse();
  await handleZiinaWebhook(mockRequest(body, signature), first);
  assert.deepEqual(first.state.jsonBody, { received: true, paid: true });

  const second = mockResponse();
  await handleZiinaWebhook(mockRequest(body, signature), second);
  assert.deepEqual(second.state.jsonBody, { received: true, duplicate: true });

  const paid = await prisma.payment.findUniqueOrThrow({
    where: { id: order.payments[0].id },
  });
  const refreshedOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
  });
  const refreshedVariant = await prisma.productVariant.findUniqueOrThrow({
    where: { id: variant.id },
  });
  const events = await prisma.paymentEvent.findMany({
    where: { paymentId: order.payments[0].id, eventId },
  });
  const commits = await prisma.inventoryTransaction.findMany({
    where: {
      variantId: variant.id,
      type: "COMMIT",
      reason: `Ziina paid ${number}`,
    },
  });

  assert.equal(paid.status, "PAID");
  assert.equal(refreshedOrder.paymentStatus, "PAID");
  assert.equal(refreshedOrder.status, "CONFIRMED");
  assert.equal(events.length, 1);
  assert.equal(commits.length, 1);
  assert.equal(refreshedVariant.stockReserved, beforeReserved);
  assert.equal(refreshedVariant.stockOnHand, beforeOnHand - 1);

  await prisma.paymentEvent.deleteMany({ where: { paymentId: order.payments[0].id } });
  await prisma.payment.delete({ where: { id: order.payments[0].id } });
  await prisma.orderEvent.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
});
