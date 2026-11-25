import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { sendBespokeQuote, sendOrderConfirmed } from "./mail/index.js";
import { readAccess, requireCustomer } from "./session.js";
import { readStoreVatRate } from "./settings.js";
import {
  publicColors,
  publicFabrics,
  publicLengths,
  requireStaff,
} from "./staff.js";

export const OWN_DESIGN = "My own design";

const centimetre = z.number().min(30).max(250);

const requestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(8).max(24),
  design: z.string().trim().min(2).max(80),
  fabric: z.string().trim().min(2).max(80),
  color: z.string().trim().min(2).max(80),
  heightCm: centimetre,
  shoulderCm: centimetre,
  sleeveCm: centimetre,
  chestCm: centimetre,
  waistCm: centimetre,
  abayaLengthIn: z.number().int().min(40).max(80),
  notes: z.string().trim().max(500).optional(),
  imageName: z.string().trim().max(120).optional(),
});

export function withOwnDesign(names: string[]) {
  const designs = [
    ...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
  ];
  if (!designs.includes(OWN_DESIGN)) designs.push(OWN_DESIGN);
  return designs;
}

export async function bespokeOptions() {
  const [products, fabrics, colors, lengths] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    publicFabrics(),
    publicColors(),
    publicLengths(),
  ]);
  return {
    designs: withOwnDesign(products.map((product) => product.name)),
    fabrics,
    colors: colors.map((color) => color.name),
    lengths,
  };
}

const quoteSchema = z.object({
  amountFils: z.number().int().min(100).max(5_000_000),
  message: z.string().trim().min(2).max(240),
});

const statusLabel: Record<string, string> = {
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  REJECTED: "Declined",
  CONVERTED: "Converted to an order",
  CANCELLED: "Cancelled",
};

export async function createBespoke(req: Request, res: Response) {
  const input = requestSchema.parse(req.body);
  const options = await bespokeOptions();
  if (!options.designs.includes(input.design))
    throw new HttpError(400, "Choose a design from the atelier list.");
  if (!options.fabrics.includes(input.fabric))
    throw new HttpError(400, "Choose a fabric from the atelier list.");
  if (!options.colors.includes(input.color))
    throw new HttpError(400, "Choose a color from the atelier list.");
  if (!options.lengths.includes(input.abayaLengthIn))
    throw new HttpError(400, "Choose a length from the atelier list.");
  const claims = readAccess(req);
  const row = await prisma.$transaction(async (tx) => {
    const latest = await tx.bespokeRequest.findFirst({
      orderBy: { createdAt: "desc" },
      select: { number: true },
    });
    const current = latest?.number.startsWith("BR-")
      ? Number(latest.number.slice(3))
      : 10000;
    const sequence = Number.isFinite(current) ? current : 10000;
    return tx.bespokeRequest.create({
      data: {
        number: `BR-${sequence + 1}`,
        userId: claims?.sub,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        design: input.design,
        fabric: input.fabric,
        color: input.color,
        notes: describe(input),
        status: "SUBMITTED",
      },
    });
  });
  res.status(201);
  return presentBespoke(row);
}

export async function listAccountBespoke(req: Request, res: Response) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (user) {
    await prisma.bespokeRequest.updateMany({
      where: { userId: null, email: user.email },
      data: { userId },
    });
  }
  const rows = await prisma.bespokeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return rows.map(presentBespoke);
}

export async function staffBespoke(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "bespoke.read");
  if (!actor) return null;
  const rows = await prisma.bespokeRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return rows.map((row) => ({ ...presentBespoke(row), ...staffFlags(row) }));
}

export async function reviewBespoke(
  req: Request,
  res: Response,
  number: string,
) {
  const actor = await requireStaff(req, res, "bespoke.write");
  if (!actor) return null;
  const existing = await prisma.bespokeRequest.findUnique({
    where: { number: number.trim() },
  });
  if (!existing) throw new HttpError(404, "That request is not on the desk.");
  if (existing.status !== "SUBMITTED")
    throw new HttpError(409, "This request is already with the atelier.");
  const row = await prisma.bespokeRequest.update({
    where: { id: existing.id },
    data: { status: "IN_REVIEW" },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "bespoke.review",
      entityType: "BespokeRequest",
      entityId: row.id,
      metadata: { number: row.number },
    },
  });
  return { ...presentBespoke(row), canReview: false, canQuote: true };
}

export async function quoteBespoke(
  req: Request,
  res: Response,
  number: string,
) {
  const actor = await requireStaff(req, res, "bespoke.write");
  if (!actor) return null;
  const input = quoteSchema.parse(req.body);
  if (input.amountFils % 100 !== 0)
    throw new HttpError(400, "Enter the quote in whole dirhams.");
  const existing = await prisma.bespokeRequest.findUnique({
    where: { number: number.trim() },
    include: { quotes: true },
  });
  if (!existing) throw new HttpError(404, "That request is not on the desk.");
  if (existing.status !== "SUBMITTED" && existing.status !== "IN_REVIEW") {
    throw new HttpError(
      409,
      "A quote can be sent while the request is still with the atelier.",
    );
  }
  if (existing.quotes.some((quote) => quote.status === "SENT")) {
    throw new HttpError(409, "A quote is already on this request.");
  }
  const row = await prisma.bespokeRequest.update({
    where: { id: existing.id },
    data: {
      status: "QUOTED",
      quotes: {
        create: {
          amountFils: input.amountFils,
          message: input.message,
          status: "SENT",
          createdBy: actor.id,
        },
      },
    },
    include: { quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "bespoke.quote",
      entityType: "BespokeRequest",
      entityId: row.id,
      metadata: { number: row.number, amountFils: input.amountFils },
    },
  });
  await sendBespokeQuote({
    to: row.email,
    customerName: row.name,
    number: row.number,
    amountFils: input.amountFils,
    message: input.message,
  });
  return { ...presentBespoke(row), canReview: false, canQuote: false };
}

export async function acceptBespoke(
  req: Request,
  res: Response,
  number: string,
) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const existing = await prisma.bespokeRequest.findUnique({
    where: { number: number.trim() },
    include: {
      quotes: {
        where: { status: "SENT" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!existing || existing.userId !== userId)
    throw new HttpError(404, "That request is not on this account.");
  const quote = existing.quotes[0];
  if (existing.status !== "QUOTED" || !quote)
    throw new HttpError(409, "This quote is no longer open to accept.");
  const row = await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quote.id },
      data: { status: "ACCEPTED" },
    });
    return tx.bespokeRequest.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED" },
      include: { quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "bespoke.accept",
      entityType: "BespokeRequest",
      entityId: row.id,
      metadata: { number: row.number, amountFils: quote.amountFils },
    },
  });
  return presentBespoke(row);
}

export async function declineBespoke(
  req: Request,
  res: Response,
  number: string,
) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const existing = await prisma.bespokeRequest.findUnique({
    where: { number: number.trim() },
    include: {
      quotes: {
        where: { status: "SENT" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!existing || existing.userId !== userId)
    throw new HttpError(404, "That request is not on this account.");
  const quote = existing.quotes[0];
  if (existing.status !== "QUOTED" || !quote)
    throw new HttpError(409, "This quote is no longer open to decline.");
  const row = await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quote.id },
      data: { status: "REJECTED" },
    });
    return tx.bespokeRequest.update({
      where: { id: existing.id },
      data: { status: "REJECTED" },
      include: { quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "bespoke.decline",
      entityType: "BespokeRequest",
      entityId: row.id,
      metadata: { number: row.number, amountFils: quote.amountFils },
    },
  });
  return presentBespoke(row);
}

export async function convertBespoke(
  req: Request,
  res: Response,
  number: string,
) {
  const userId = await requireCustomer(req, res);
  if (!userId) return null;
  const existing = await prisma.bespokeRequest.findUnique({
    where: { number: number.trim() },
    include: {
      quotes: {
        where: { status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!existing || existing.userId !== userId)
    throw new HttpError(404, "That request is not on this account.");
  const key = `bespoke:${existing.id}`;
  if (existing.status === "CONVERTED") return placedOrder(existing.id, key);
  if (existing.status !== "ACCEPTED" || !existing.quotes[0]) {
    throw new HttpError(409, "Accept the quote before it becomes an order.");
  }
  const quote = existing.quotes[0];
  const address =
    (await prisma.address.findFirst({ where: { userId, isDefault: true } })) ??
    (await prisma.address.findFirst({
      where: { userId },
      orderBy: { id: "asc" },
    }));
  if (!address)
    throw new HttpError(
      400,
      "Save a Dubai address before this request becomes an order.",
    );
  const priced = await dubaiCashTotal(address.city, quote.amountFils);
  const length = existing.notes?.match(/Length (\d+) in/);
  const line = [address.street, address.building, address.apartment]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
  try {
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          number: orderNumber,
          userId,
          email: existing.email,
          phone: address.phone,
          customerName: address.fullName,
          status: "CONFIRMED",
          paymentStatus: "UNPAID",
          subtotalFils: priced.subtotalFils,
          discountFils: 0,
          shippingFils: priced.shippingFils,
          vatFils: priced.vatFils,
          totalFils: priced.totalFils,
          pricesIncludeVat: true,
          idempotencyKey: key,
          addressLine: `${line}, ${address.city}`,
          items: {
            create: {
              name: existing.design,
              sku: `BESPOKE-${existing.number}`,
              color: existing.color,
              size: "Bespoke",
              fabric: existing.fabric,
              lengthLabel: length ? `${length[1]} in` : null,
              quantity: 1,
              unitPriceFils: quote.amountFils,
              lineTotalFils: quote.amountFils,
            },
          },
          events: {
            create: {
              status: "CONFIRMED",
              note: `Bespoke ${existing.number}. Cash on delivery. Payment stays unpaid until collection is recorded.`,
            },
          },
          payments: {
            create: {
              provider: "cod",
              method: "cod",
              amountFils: priced.totalFils,
              status: "UNPAID",
            },
          },
        },
      });
      await tx.bespokeRequest.update({
        where: { id: existing.id },
        data: { status: "CONVERTED" },
      });
      return created;
    });
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: "bespoke.convert",
        entityType: "BespokeRequest",
        entityId: existing.id,
        metadata: {
          number: existing.number,
          orderNumber: order.number,
          totalFils: order.totalFils,
        },
      },
    });
    await sendOrderConfirmed({
      to: order.email,
      customerName: order.customerName,
      number: order.number,
      totalFils: order.totalFils,
      paymentMethod: "cod",
    });
    return placedOrder(existing.id, key);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return placedOrder(existing.id, key);
    throw error;
  }
}

function describe(input: z.infer<typeof requestSchema>) {
  const lines = [
    `Height ${input.heightCm} cm. Shoulder ${input.shoulderCm} cm. Sleeve ${input.sleeveCm} cm. Chest ${input.chestCm} cm. Waist ${input.waistCm} cm. Length ${input.abayaLengthIn} in.`,
  ];
  const imageName = input.imageName?.trim();
  if (imageName)
    lines.push(
      `Inspiration file named ${imageName} stays on the customer's device.`,
    );
  const notes = input.notes?.trim();
  if (notes) lines.push(notes);
  return lines.join("\n");
}

function staffFlags(row: { status: string; quotes: { status: string }[] }) {
  const quoted = row.quotes.some((quote) => quote.status === "SENT");
  const open = row.status === "SUBMITTED" || row.status === "IN_REVIEW";
  return {
    canReview: row.status === "SUBMITTED",
    canQuote: open && !quoted,
  };
}

function presentBespoke(row: {
  number: string;
  name: string;
  email: string;
  phone: string;
  design: string;
  fabric: string;
  color: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  quotes?: { amountFils: number; message: string; status: string }[];
}) {
  const quote = row.quotes?.find(
    (item) =>
      item.status === "SENT" ||
      item.status === "ACCEPTED" ||
      item.status === "REJECTED",
  );
  return {
    number: row.number,
    name: row.name,
    email: row.email,
    phone: row.phone,
    design: row.design,
    fabric: row.fabric,
    color: row.color,
    notes: row.notes,
    status: row.status,
    statusLabel: statusLabel[row.status] ?? row.status,
    createdAt: row.createdAt.toISOString(),
    quote: quote
      ? { amountFils: quote.amountFils, message: quote.message }
      : null,
    canAccept: row.status === "QUOTED" && quote?.status === "SENT",
    canDecline: row.status === "QUOTED" && quote?.status === "SENT",
    canConvert: row.status === "ACCEPTED" && quote?.status === "ACCEPTED",
  };
}

async function placedOrder(requestId: string, key: string) {
  const [row, order] = await Promise.all([
    prisma.bespokeRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.order.findUnique({ where: { idempotencyKey: key } }),
  ]);
  if (!order) throw new HttpError(409, "This request is already an order.");
  return {
    request: presentBespoke(row),
    orderNumber: order.number,
    totalFils: order.totalFils,
  };
}

async function dubaiCashTotal(city: string, subtotalFils: number) {
  const zone = await prisma.shippingZone.findFirst({
    where: {
      isActive: true,
      emirate: { equals: city.trim(), mode: "insensitive" },
    },
    include: {
      rates: { where: { isActive: true }, include: { method: true } },
    },
  });
  const rate = zone?.rates.find(
    (item) => item.method.isActive && item.method.codAllowed,
  );
  if (!zone || !rate)
    throw new HttpError(
      400,
      "Cash on delivery is only configured for Dubai right now.",
    );
  const shippingFils =
    rate.freeOverFils != null && subtotalFils >= rate.freeOverFils
      ? 0
      : rate.priceFils;
  const totalFils = subtotalFils + shippingFils;
  const vatRate = await readStoreVatRate();
  const vatFils =
    vatRate > 0 ? totalFils - Math.round(totalFils / (1 + vatRate)) : 0;
  return { subtotalFils, shippingFils, vatFils, totalFils };
}

async function nextOrderNumber(tx: Prisma.TransactionClient) {
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
