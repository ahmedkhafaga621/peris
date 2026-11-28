import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { OrderStatus, Prisma } from "@prisma/client";
import { HttpError } from "./cart.js";
import { prisma } from "./db.js";
import { fulfillmentLabel, nextSteps } from "./fulfillment.js";
import { sendOrderShipped, sendOrderStatus } from "./mail/index.js";
import { readCookie } from "./session.js";

const staffCookie = "peris_staff_refresh";
const refreshDays = 30;

export const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const productUpdateSchema = z.object({
  priceFils: z.number().int().min(100).max(5_000_000),
  isPublished: z.boolean(),
});

const stockAdjustSchema = z.object({
  delta: z.number().int().min(-100).max(100),
  reason: z.string().trim().min(2).max(160),
});

const refundSchema = z.object({
  reason: z.string().trim().min(2).max(160),
});

const advanceSchema = z.object({
  status: z.enum([
    "PROCESSING",
    "TAILORING",
    "READY_FOR_SHIPMENT",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ]),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Tracking link must be a full http or https address." },
    ),
  carrier: z.string().trim().max(80).optional(),
});

type StaffClaims = { sub: string; email: string; accountType: "STAFF" };

function accessSecret() {
  return process.env.JWT_ACCESS_SECRET ?? "dev-only-access-secret";
}

function signStaffAccess(user: { id: string; email: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, accountType: "STAFF" },
    accessSecret(),
    { expiresIn: "15m" },
  );
}

function readStaff(req: Request): StaffClaims | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), accessSecret());
    if (
      typeof payload === "string" ||
      payload.accountType !== "STAFF" ||
      typeof payload.sub !== "string"
    )
      return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      accountType: "STAFF",
    };
  } catch {
    return null;
  }
}

export async function staffLogin(req: Request, res: Response) {
  const input = staffLoginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !(await bcrypt.compare(input.password, user.passwordHash))
  ) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  if (user.accountType !== "STAFF")
    throw new HttpError(403, "Use the customer entrance for this account.");
  if (!user.role) throw new HttpError(403, "This staff account has no role.");
  const accessToken = await issueStaffSession(res, user);
  return { accessToken, user: publicStaff(user) };
}

export async function refreshStaff(req: Request, res: Response) {
  const refresh = readCookie(req, staffCookie);
  if (!refresh) throw new HttpError(401, "Sign in to continue.");
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refresh) },
  });
  if (
    !existing ||
    existing.revokedAt ||
    existing.expiresAt.getTime() <= Date.now()
  ) {
    clearStaffCookie(res);
    throw new HttpError(401, "Sign in to continue.");
  }
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (
    !user ||
    user.status !== "ACTIVE" ||
    user.accountType !== "STAFF" ||
    !user.role
  ) {
    clearStaffCookie(res);
    throw new HttpError(401, "Sign in to continue.");
  }
  const accessToken = await issueStaffSession(res, user);
  return { accessToken, user: publicStaff(user) };
}

export async function logoutStaff(req: Request, res: Response) {
  const refresh = readCookie(req, staffCookie);
  if (refresh) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearStaffCookie(res);
}

export async function staffDashboard(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "dashboard.read");
  if (!actor) return null;
  const period = readPeriod(req.query);
  const [orders, variants] = await Promise.all([
    prisma.order.findMany({
      where: placedWhere(period.window),
      select: { paymentStatus: true, totalFils: true, status: true },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isPublished: true } },
      include: { product: true, color: true, size: true },
    }),
  ]);
  const unpaid = orders.filter(
    (order) => order.paymentStatus === "UNPAID" && order.status !== "CANCELLED",
  );
  const collected = orders.filter(
    (order) => order.paymentStatus === "PAID" && order.status !== "REFUNDED",
  );
  const lowStock = variants
    .map((variant) => ({
      sku: variant.sku,
      name: variant.product.name,
      color: variant.color.name,
      size: variant.size.code,
      available: variant.stockOnHand - variant.stockReserved,
    }))
    .filter((variant) => variant.available <= 2)
    .sort((a, b) => a.available - b.available)
    .slice(0, 8);
  return {
    range: period.range,
    orders: orders.length,
    unpaidCount: unpaid.length,
    unpaidFils: unpaid.reduce((sum, order) => sum + order.totalFils, 0),
    collectedFils: collected.reduce((sum, order) => sum + order.totalFils, 0),
    lowStock,
  };
}

export async function staffProducts(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      categories: { include: { category: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        include: { color: true },
      },
      variants: { include: { color: true } },
    },
  });
  return products.map(presentStaffProduct);
}

const productImageInputSchema = z.object({
  url: z.string().trim().min(1).max(500),
  alt: z.string().trim().min(2).max(180).optional(),
  position: z.enum(["center top", "center", "center bottom"]).optional(),
  colorName: z.string().trim().min(1).max(40).nullable().optional(),
  colorId: z.string().trim().min(1).max(40).nullable().optional(),
});

const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  styleCode: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/),
  description: z.string().trim().min(8).max(800),
  fabric: z.string().trim().min(2).max(80),
  priceFils: z.number().int().min(100).max(5_000_000),
  collectionSlug: z.enum(["casual-elegance", "evening-occasions"]),
  images: z.array(productImageInputSchema).min(1).max(24),
  colorNames: z.array(z.string().trim().min(1).max(40)).min(1).max(20),
  // legacy single-color / two-slot fields still accepted
  imageUrl: z.string().trim().min(1).max(500).optional(),
  alt: z.string().trim().min(8).max(180).optional(),
  hoverImageUrl: z.string().trim().max(500).optional(),
  position: z.enum(["center top", "center", "center bottom"]).optional(),
  colorName: z.string().trim().min(1).max(40).optional(),
  isPublished: z.boolean().default(false),
  isNew: z.boolean().default(true),
  isBestseller: z.boolean().default(false),
});

export async function createStaffProduct(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const raw = req.body as Record<string, unknown>;
  const normalized = {
    ...raw,
    colorNames:
      Array.isArray(raw.colorNames) && raw.colorNames.length
        ? raw.colorNames
        : raw.colorName
          ? [raw.colorName]
          : [],
    images:
      Array.isArray(raw.images) && raw.images.length
        ? raw.images
        : raw.imageUrl
          ? [
              {
                url: raw.imageUrl,
                alt: raw.alt,
                position: raw.position,
                colorName: null,
              },
              ...(typeof raw.hoverImageUrl === "string" &&
              raw.hoverImageUrl.trim()
                ? [
                    {
                      url: raw.hoverImageUrl,
                      alt: `Closer view of ${String(raw.name ?? "piece")}`,
                      position: "center",
                      colorName: null,
                    },
                  ]
                : []),
            ]
          : [],
  };
  const input = productCreateSchema.parse(normalized);
  if (input.priceFils % 100 !== 0)
    throw new HttpError(400, "Enter the price in whole dirhams.");

  const styleCode = input.styleCode.toUpperCase();
  const takenStyle = await prisma.product.findFirst({ where: { styleCode } });
  if (takenStyle)
    throw new HttpError(409, "That style code is already on the desk.");

  const baseSlug = slugifyPiece(input.name);
  if (!baseSlug) throw new HttpError(400, "Enter a name that can become a slug.");
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const category = await prisma.category.findUnique({
    where: { slug: input.collectionSlug },
  });
  if (!category) throw new HttpError(404, "That collection is not on the desk.");

  const colors = await prisma.color.findMany({
    where: { isActive: true, name: { in: input.colorNames } },
  });
  if (!colors.length)
    throw new HttpError(409, "Choose at least one color on the desk.");
  if (colors.length !== new Set(input.colorNames).size)
    throw new HttpError(404, "One of the colors is not on the desk.");

  const fabricRow =
    (await prisma.fabric.findFirst({
      where: { name: "Sample crepe" },
    })) ??
    (await prisma.fabric.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!fabricRow)
    throw new HttpError(409, "Add a fabric before adding a piece.");

  const sizes = await prisma.size.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (sizes.length === 0)
    throw new HttpError(409, "Add a size before adding a piece.");

  const lengths = await prisma.lengthOption.findMany({
    where: { isActive: true },
    orderBy: { inches: "asc" },
  });

  const colorByName = new Map(colors.map((color) => [color.name, color]));

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: input.name,
        slug,
        styleCode,
        description: input.description,
        fabricDetails: input.fabric,
        basePriceFils: input.priceFils,
        isPublished: input.isPublished,
        isNew: input.isNew,
        isBestseller: input.isBestseller,
        isPlaceholder: false,
      },
    });
    await tx.productCategory.create({
      data: { productId: created.id, categoryId: category.id },
    });
    await tx.productImage.createMany({
      data: input.images.map((image, index) => {
        const colorName = image.colorName?.trim() || null;
        const color =
          (image.colorId
            ? colors.find((row) => row.id === image.colorId)
            : null) ??
          (colorName ? colorByName.get(colorName) : null) ??
          null;
        return {
          productId: created.id,
          url: image.url,
          alt: image.alt?.trim() || input.name,
          position: image.position ?? "center",
          sortOrder: index,
          colorId: color?.id ?? null,
        };
      }),
    });
    if (lengths.length) {
      await tx.productLength.createMany({
        data: lengths.map((length) => ({
          productId: created.id,
          lengthOptionId: length.id,
        })),
      });
    }
    await tx.productVariant.createMany({
      data: colors.flatMap((color) =>
        sizes.map((size) => ({
          productId: created.id,
          sku: `${styleCode}-${color.name}-${size.code}`
            .toUpperCase()
            .replace(/\s+/g, ""),
          colorId: color.id,
          sizeId: size.id,
          fabricId: fabricRow.id,
          stockOnHand: 8,
        })),
      ),
    });
    return created;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      metadata: {
        slug: product.slug,
        styleCode: product.styleCode,
        collectionSlug: input.collectionSlug,
        colors: colors.map((color) => color.name),
        images: input.images.length,
      },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

export async function deleteStaffProduct(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { select: { id: true, stockReserved: true } } },
  });
  if (!product) throw new HttpError(404, "That piece was not found.");
  if (product.variants.some((variant) => variant.stockReserved > 0)) {
    throw new HttpError(
      409,
      "This piece is held for a payment. Release that order before removing it.",
    );
  }
  const variantIds = product.variants.map((variant) => variant.id);
  await prisma.$transaction(async (tx) => {
    if (variantIds.length) {
      await tx.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
      await tx.inventoryTransaction.deleteMany({
        where: { variantId: { in: variantIds } },
      });
    }
    await tx.wishlistItem.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "product.delete",
        entityType: "Product",
        entityId: id,
        metadata: { name: product.name, slug: product.slug, styleCode: product.styleCode },
        ip: req.ip,
      },
    });
  });
  return { id, name: product.name };
}

function slugifyPiece(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function updateStaffProduct(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = productUpdateSchema.parse(req.body);
  if (input.priceFils % 100 !== 0)
    throw new HttpError(400, "Enter the price in whole dirhams.");
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  const product = await prisma.product.update({
    where: { id },
    data: { basePriceFils: input.priceFils, isPublished: input.isPublished },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.update",
      entityType: "Product",
      entityId: product.id,
      metadata: {
        slug: product.slug,
        fromPriceFils: existing.basePriceFils,
        toPriceFils: product.basePriceFils,
        fromPublished: existing.isPublished,
        toPublished: product.isPublished,
      },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const bestsellerSchema = z.object({
  isBestseller: z.boolean(),
});

export async function updateStaffBestseller(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = bestsellerSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.isBestseller === input.isBestseller)
    return presentedProduct(existing.id);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { isBestseller: input.isBestseller },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.bestseller",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug, toBestseller: product.isBestseller },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const arrivalSchema = z.object({
  isNew: z.boolean(),
});

export async function updateStaffArrival(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = arrivalSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.isNew === input.isNew) return presentedProduct(existing.id);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { isNew: input.isNew },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.arrival",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug, toNew: product.isNew },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const collectionSchema = z.object({
  slug: z.enum(["casual-elegance", "evening-occasions"]),
});

export async function updateStaffCollection(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = collectionSchema.parse(req.body);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  const category = await prisma.category.findUnique({
    where: { slug: input.slug },
  });
  if (!category)
    throw new HttpError(404, "That collection is not on the desk.");
  const current = existing.categories.map((row) => row.category.slug);
  if (current.length === 1 && current[0] === category.slug)
    return presentStaffProduct(existing);
  await prisma.$transaction([
    prisma.productCategory.deleteMany({ where: { productId: existing.id } }),
    prisma.productCategory.create({
      data: { productId: existing.id, categoryId: category.id },
    }),
  ]);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.collection",
      entityType: "Product",
      entityId: existing.id,
      metadata: { slug: existing.slug, toSlug: category.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

const compareSchema = z.object({
  compareFils: z.number().int().nullable(),
});

export async function updateStaffCompare(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = compareSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (input.compareFils !== null) {
    if (input.compareFils % 100 !== 0)
      throw new HttpError(400, "Enter the previous price in whole dirhams.");
    if (input.compareFils <= existing.basePriceFils)
      throw new HttpError(
        400,
        "The previous price has to sit above the selling price.",
      );
  }
  if (existing.compareAtFils === input.compareFils)
    return presentedProduct(existing.id);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { compareAtFils: input.compareFils },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.compare",
      entityType: "Product",
      entityId: product.id,
      metadata: {
        slug: product.slug,
        fromCompareFils: existing.compareAtFils,
        toCompareFils: product.compareAtFils,
      },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const descriptionSchema = z.object({
  description: z.string().trim().min(8).max(800),
});

export async function updateStaffDescription(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = descriptionSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.description === input.description)
    return presentedProduct(existing.id);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { description: input.description },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.description",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const fabricSchema = z.object({
  fabric: z.string().trim().min(2).max(80),
});

export async function updateStaffFabric(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = fabricSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.fabricDetails === input.fabric)
    return presentedProduct(existing.id);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { fabricDetails: input.fabric },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.fabric",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const styleCodeSchema = z.object({
  styleCode: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/),
});

export async function updateStaffStyleCode(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = styleCodeSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.styleCode === input.styleCode)
    return presentedProduct(existing.id);
  const taken = await prisma.product.findFirst({
    where: { styleCode: input.styleCode, NOT: { id: existing.id } },
  });
  if (taken)
    throw new HttpError(409, "That style code is already on the desk.");
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { styleCode: input.styleCode },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.style",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const nameSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function updateStaffName(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = nameSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.name === input.name) return presentedProduct(existing.id);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { name: input.name },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.name",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(product.id);
}

const altSchema = z.object({
  alt: z.string().trim().min(8).max(180),
});

export async function updateStaffAlt(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = altSchema.parse(req.body);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  const image = existing.images[0];
  if (!image)
    throw new HttpError(404, "That piece has no photograph on the desk.");
  if (image.alt === input.alt) return presentedProduct(existing.id);
  await prisma.productImage.update({
    where: { id: image.id },
    data: { alt: input.alt },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.alt",
      entityType: "Product",
      entityId: existing.id,
      metadata: { slug: existing.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

const placeSchema = z.object({
  position: z.enum(["center top", "center", "center bottom"]),
});

export async function updateStaffPlace(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = placeSchema.parse(req.body);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  const image = existing.images[0];
  if (!image)
    throw new HttpError(404, "That piece has no photograph on the desk.");
  if (image.position === input.position) return presentedProduct(existing.id);
  await prisma.productImage.update({
    where: { id: image.id },
    data: { position: input.position },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.place",
      entityType: "Product",
      entityId: existing.id,
      metadata: { slug: existing.slug },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

const productImageSchema = z.object({
  url: z.string().trim().min(1).max(500),
  slot: z.enum(["primary", "hover"]).optional(),
  imageId: z.string().trim().min(1).optional(),
  alt: z.string().trim().min(2).max(180).optional(),
  position: z.enum(["center top", "center", "center bottom"]).optional(),
  colorId: z.string().trim().min(1).max(40).nullable().optional(),
  colorName: z.string().trim().min(1).max(40).nullable().optional(),
});

async function resolveImageColorId(
  productId: string,
  colorId: string | null | undefined,
  colorName: string | null | undefined,
) {
  if (colorId === null || colorName === null) return null;
  if (colorId) {
    const color = await prisma.color.findFirst({
      where: { id: colorId, isActive: true },
    });
    if (!color) throw new HttpError(404, "That color is not on the desk.");
    return color.id;
  }
  if (colorName) {
    const color = await prisma.color.findFirst({
      where: { name: colorName, isActive: true },
    });
    if (!color) throw new HttpError(404, "That color is not on the desk.");
    const onPiece = await prisma.productVariant.findFirst({
      where: { productId, colorId: color.id },
    });
    if (!onPiece)
      throw new HttpError(409, "Add that color to the piece before tagging photos.");
    return color.id;
  }
  return undefined;
}

export async function updateStaffProductImage(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = productImageSchema.parse(req.body);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");

  const resolvedColorId = await resolveImageColorId(
    existing.id,
    input.colorId,
    input.colorName,
  );

  let current =
    (input.imageId
      ? existing.images.find((image) => image.id === input.imageId)
      : null) ?? null;

  if (!current && input.slot) {
    const sortOrder = input.slot === "hover" ? 1 : 0;
    current =
      existing.images.find((image) => image.sortOrder === sortOrder) ??
      (input.slot === "primary" ? existing.images[0] : existing.images[1]) ??
      null;
  }

  if (current) {
    await prisma.productImage.update({
      where: { id: current.id },
      data: {
        url: input.url,
        alt: input.alt ?? current.alt ?? existing.name,
        position: input.position ?? current.position ?? "center",
        ...(resolvedColorId !== undefined ? { colorId: resolvedColorId } : {}),
      },
    });
  } else {
    const nextOrder =
      existing.images.reduce((max, image) => Math.max(max, image.sortOrder), -1) +
      1;
    await prisma.productImage.create({
      data: {
        productId: existing.id,
        url: input.url,
        alt: input.alt ?? existing.name,
        position: input.position ?? "center",
        sortOrder: input.slot === "hover" ? 1 : input.slot === "primary" ? 0 : nextOrder,
        colorId: resolvedColorId ?? null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.image",
      entityType: "Product",
      entityId: existing.id,
      metadata: {
        slug: existing.slug,
        slot: input.slot ?? null,
        imageId: input.imageId ?? null,
      },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

export async function createStaffProductImage(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = productImageInputSchema.parse(req.body);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  if (existing.images.length >= 24)
    throw new HttpError(409, "This piece already has 24 photographs.");

  const colorId =
    (await resolveImageColorId(existing.id, input.colorId, input.colorName)) ??
    null;
  const sortOrder =
    existing.images.reduce((max, image) => Math.max(max, image.sortOrder), -1) +
    1;

  await prisma.productImage.create({
    data: {
      productId: existing.id,
      url: input.url,
      alt: input.alt?.trim() || existing.name,
      position: input.position ?? "center",
      sortOrder,
      colorId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.image.create",
      entityType: "Product",
      entityId: existing.id,
      metadata: { slug: existing.slug, colorId },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

export async function deleteStaffProductImage(
  req: Request,
  res: Response,
  id: string,
  imageId: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");
  const image = existing.images.find((row) => row.id === imageId);
  if (!image) throw new HttpError(404, "That photograph is not on the desk.");
  if (existing.images.length <= 1)
    throw new HttpError(409, "Keep at least one photograph on the piece.");

  await prisma.productImage.delete({ where: { id: image.id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.image.delete",
      entityType: "Product",
      entityId: existing.id,
      metadata: { slug: existing.slug, imageId },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

const productColorSchema = z.object({
  colorName: z.string().trim().min(1).max(40),
});

export async function addStaffProductColor(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = productColorSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That piece is not on the desk.");

  const color = await prisma.color.findFirst({
    where: { name: input.colorName, isActive: true },
  });
  if (!color) throw new HttpError(404, "That color is not on the desk.");

  const already = await prisma.productVariant.findFirst({
    where: { productId: existing.id, colorId: color.id },
  });
  if (already) throw new HttpError(409, "That color is already on the piece.");

  const fabricRow =
    (await prisma.fabric.findFirst({ where: { name: "Sample crepe" } })) ??
    (await prisma.fabric.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!fabricRow)
    throw new HttpError(409, "Add a fabric before adding a color.");

  const sizes = await prisma.size.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!sizes.length) throw new HttpError(409, "Add a size before adding a color.");

  await prisma.productVariant.createMany({
    data: sizes.map((size) => ({
      productId: existing.id,
      sku: `${existing.styleCode}-${color.name}-${size.code}`
        .toUpperCase()
        .replace(/\s+/g, ""),
      colorId: color.id,
      sizeId: size.id,
      fabricId: fabricRow.id,
      stockOnHand: 8,
    })),
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "product.color.add",
      entityType: "Product",
      entityId: existing.id,
      metadata: { slug: existing.slug, color: color.name },
      ip: req.ip,
    },
  });
  return presentedProduct(existing.id);
}

export async function publicLengths() {
  const rows = await prisma.lengthOption.findMany({
    where: { isActive: true },
    orderBy: { inches: "asc" },
  });
  return rows.map((row) => row.inches);
}

export async function staffLengths(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const rows = await prisma.lengthOption.findMany({
    orderBy: { inches: "asc" },
  });
  return rows.map(presentLength);
}

const lengthCreateSchema = z.object({
  inches: z.number().int().min(40).max(70),
});

export async function createStaffLength(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = lengthCreateSchema.parse(req.body);
  const taken = await prisma.lengthOption.findUnique({
    where: { inches: input.inches },
  });
  if (taken) throw new HttpError(409, "That length is already on the desk.");
  const length = await prisma.lengthOption.create({
    data: {
      inches: input.inches,
      label: `${input.inches} in`,
      isActive: true,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "length.create",
      entityType: "LengthOption",
      entityId: length.id,
      metadata: { inches: length.inches },
      ip: req.ip,
    },
  });
  return presentLength(length);
}

const lengthSchema = z.object({
  isActive: z.boolean(),
});

export async function updateStaffLength(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = lengthSchema.parse(req.body);
  const existing = await prisma.lengthOption.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That length is not on the desk.");
  if (existing.isActive === input.isActive) return presentLength(existing);
  if (!input.isActive) {
    const others = await prisma.lengthOption.count({
      where: { isActive: true, id: { not: existing.id } },
    });
    if (others < 1)
      throw new HttpError(409, "Keep at least one length on the shop.");
  }
  const length = await prisma.lengthOption.update({
    where: { id: existing.id },
    data: { isActive: input.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "length.publish",
      entityType: "LengthOption",
      entityId: length.id,
      metadata: { inches: length.inches, toActive: length.isActive },
      ip: req.ip,
    },
  });
  return presentLength(length);
}

function presentLength(row: {
  id: string;
  label: string;
  inches: number;
  isActive: boolean;
}) {
  return {
    id: row.id,
    label: row.label,
    inches: row.inches,
    isActive: row.isActive,
  };
}

export async function publicSizes() {
  const rows = await prisma.size.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => row.code);
}

export async function staffSizes(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const rows = await prisma.size.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(presentSize);
}

const sizeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9]+$/),
});

export async function createStaffSize(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = sizeCreateSchema.parse(req.body);
  const code = input.code.toUpperCase();
  const taken = await prisma.size.findFirst({
    where: { OR: [{ code }, { name: code }] },
  });
  if (taken) throw new HttpError(409, "That size is already on the desk.");
  const last = await prisma.size.findFirst({ orderBy: { sortOrder: "desc" } });
  const size = await prisma.size.create({
    data: {
      code,
      name: code,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      isActive: true,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "size.create",
      entityType: "Size",
      entityId: size.id,
      metadata: { code: size.code },
      ip: req.ip,
    },
  });
  return presentSize(size);
}

const sizeSchema = z.object({
  isActive: z.boolean(),
});

export async function updateStaffSize(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = sizeSchema.parse(req.body);
  const existing = await prisma.size.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That size is not on the desk.");
  if (existing.isActive === input.isActive) return presentSize(existing);
  if (!input.isActive) {
    const others = await prisma.size.count({
      where: { isActive: true, id: { not: existing.id } },
    });
    if (others < 1)
      throw new HttpError(409, "Keep at least one size on the shop.");
  }
  const size = await prisma.size.update({
    where: { id: existing.id },
    data: { isActive: input.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "size.publish",
      entityType: "Size",
      entityId: size.id,
      metadata: { code: size.code, toActive: size.isActive },
      ip: req.ip,
    },
  });
  return presentSize(size);
}

function presentSize(row: {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}) {
  return { id: row.id, code: row.code, name: row.name, isActive: row.isActive };
}

export async function publicColors() {
  const rows = await prisma.color.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => ({ name: row.name, hex: row.hex }));
}

export async function staffColors(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const rows = await prisma.color.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(presentColor);
}

const colorCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function createStaffColor(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = colorCreateSchema.parse(req.body);
  const taken = await prisma.color.findUnique({ where: { name: input.name } });
  if (taken) throw new HttpError(409, "That color is already on the desk.");
  const last = await prisma.color.findFirst({ orderBy: { sortOrder: "desc" } });
  const color = await prisma.color.create({
    data: {
      name: input.name,
      hex: input.hex.toLowerCase(),
      sortOrder: (last?.sortOrder ?? -1) + 1,
      isActive: true,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "color.create",
      entityType: "Color",
      entityId: color.id,
      metadata: { name: color.name, hex: color.hex },
      ip: req.ip,
    },
  });
  return presentColor(color);
}

const colorSchema = z.object({
  isActive: z.boolean(),
});

export async function updateStaffColor(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = colorSchema.parse(req.body);
  const existing = await prisma.color.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That color is not on the desk.");
  if (existing.isActive === input.isActive) return presentColor(existing);
  if (!input.isActive) {
    const others = await prisma.color.count({
      where: { isActive: true, id: { not: existing.id } },
    });
    if (others < 1)
      throw new HttpError(409, "Keep at least one color on the shop.");
  }
  const color = await prisma.color.update({
    where: { id: existing.id },
    data: { isActive: input.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "color.publish",
      entityType: "Color",
      entityId: color.id,
      metadata: { name: color.name, toActive: color.isActive },
      ip: req.ip,
    },
  });
  return presentColor(color);
}

function presentColor(row: {
  id: string;
  name: string;
  hex: string;
  isActive: boolean;
}) {
  return { id: row.id, name: row.name, hex: row.hex, isActive: row.isActive };
}

export async function publicFabrics() {
  const rows = await prisma.fabric.findMany({
    where: { isCommission: true, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => row.name);
}

export async function publicFabricGallery() {
  const rows = await prisma.fabric.findMany({
    where: { isCommission: true, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => ({
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.imageUrl ?? "",
  }));
}

export async function staffFabrics(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const rows = await prisma.fabric.findMany({
    where: { isCommission: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(presentFabric);
}

const fabricCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function createStaffFabric(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = fabricCreateSchema.parse(req.body);
  const taken = await prisma.fabric.findUnique({ where: { name: input.name } });
  if (taken) throw new HttpError(409, "That fabric is already on the desk.");
  const last = await prisma.fabric.findFirst({
    where: { isCommission: true },
    orderBy: { sortOrder: "desc" },
  });
  const fabric = await prisma.fabric.create({
    data: {
      name: input.name,
      isCommission: true,
      isActive: true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "fabric.create",
      entityType: "Fabric",
      entityId: fabric.id,
      metadata: { name: fabric.name },
      ip: req.ip,
    },
  });
  return presentFabric(fabric);
}

const fabricListSchema = z.object({
  isActive: z.boolean(),
});

export async function updateStaffFabricList(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = fabricListSchema.parse(req.body);
  const existing = await prisma.fabric.findUnique({ where: { id } });
  if (!existing || !existing.isCommission)
    throw new HttpError(404, "That fabric is not on the desk.");
  if (existing.isActive === input.isActive) return presentFabric(existing);
  if (!input.isActive) {
    const others = await prisma.fabric.count({
      where: { isCommission: true, isActive: true, id: { not: existing.id } },
    });
    if (others < 1)
      throw new HttpError(409, "Keep at least one fabric on the shop.");
  }
  const fabric = await prisma.fabric.update({
    where: { id: existing.id },
    data: { isActive: input.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "fabric.publish",
      entityType: "Fabric",
      entityId: fabric.id,
      metadata: { name: fabric.name, toActive: fabric.isActive },
      ip: req.ip,
    },
  });
  return presentFabric(fabric);
}

function presentFabric(row: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.imageUrl ?? "",
    isActive: row.isActive,
  };
}

const fabricImageSchema = z.object({
  imageUrl: z.string().trim().max(500),
});

export async function updateStaffFabricImage(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = fabricImageSchema.parse(req.body);
  const imageUrl = storedImage(input.imageUrl);
  const existing = await prisma.fabric.findUnique({ where: { id } });
  if (!existing || !existing.isCommission)
    throw new HttpError(404, "That fabric is not on the desk.");
  const fabric = await prisma.fabric.update({
    where: { id: existing.id },
    data: { imageUrl },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "fabric.image",
      entityType: "Fabric",
      entityId: fabric.id,
      metadata: { name: fabric.name },
      ip: req.ip,
    },
  });
  return presentFabric(fabric);
}

export async function staffCategories(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const rows = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return rows.map(presentStaffCategory);
}

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(8).max(280),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export async function createStaffCategory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = categoryCreateSchema.parse(req.body);
  const slug = input.slug || slugifyPiece(input.name);
  if (!slug) throw new HttpError(400, "Enter a name that can become a slug.");
  const taken = await prisma.category.findUnique({ where: { slug } });
  if (taken)
    throw new HttpError(409, "That collection slug is already on the desk.");
  const last = await prisma.category.findFirst({
    orderBy: { sortOrder: "desc" },
  });
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      isPublished: true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "category.create",
      entityType: "Category",
      entityId: category.id,
      metadata: { slug: category.slug },
      ip: req.ip,
    },
  });
  return presentStaffCategory({ ...category, _count: { products: 0 } });
}

function presentStaffCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  isPublished: boolean;
  _count: { products: number };
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    isPublished: row.isPublished,
    pieces: row._count.products,
  };
}

const categorySchema = z.object({
  isPublished: z.boolean(),
});

export async function updateStaffCategory(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = categorySchema.parse(req.body);
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing)
    throw new HttpError(404, "That collection is not on the desk.");
  if (existing.isPublished === input.isPublished) {
    return presentStaffCategory(existing);
  }
  const category = await prisma.category.update({
    where: { id: existing.id },
    data: { isPublished: input.isPublished },
    include: { _count: { select: { products: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "category.publish",
      entityType: "Category",
      entityId: category.id,
      metadata: { slug: category.slug, toPublished: category.isPublished },
      ip: req.ip,
    },
  });
  return presentStaffCategory(category);
}

const categoryLineSchema = z.object({
  description: z.string().trim().min(8).max(280),
});

export async function updateStaffCategoryLine(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = categoryLineSchema.parse(req.body);
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing)
    throw new HttpError(404, "That collection is not on the desk.");
  if (existing.description === input.description) {
    return presentStaffCategory(existing);
  }
  const category = await prisma.category.update({
    where: { id: existing.id },
    data: { description: input.description },
    include: { _count: { select: { products: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "category.line",
      entityType: "Category",
      entityId: category.id,
      metadata: { slug: category.slug },
      ip: req.ip,
    },
  });
  return presentStaffCategory(category);
}

const categoryNameSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function updateStaffCategoryName(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = categoryNameSchema.parse(req.body);
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing)
    throw new HttpError(404, "That collection is not on the desk.");
  if (existing.name === input.name) {
    return presentStaffCategory(existing);
  }
  const category = await prisma.category.update({
    where: { id: existing.id },
    data: { name: input.name },
    include: { _count: { select: { products: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "category.name",
      entityType: "Category",
      entityId: category.id,
      metadata: { slug: category.slug },
      ip: req.ip,
    },
  });
  return presentStaffCategory(category);
}

const categoryImageSchema = z.object({
  imageUrl: z.string().trim().max(500),
});

export async function updateStaffCategoryImage(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "products.write");
  if (!actor) return null;
  const input = categoryImageSchema.parse(req.body);
  const imageUrl = storedImage(input.imageUrl);
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing)
    throw new HttpError(404, "That collection is not on the desk.");
  const category = await prisma.category.update({
    where: { id: existing.id },
    data: { imageUrl },
    include: { _count: { select: { products: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "category.image",
      entityType: "Category",
      entityId: category.id,
      metadata: { slug: category.slug },
      ip: req.ip,
    },
  });
  return presentStaffCategory(category);
}

function storedImage(value: string) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return value;
  } catch {
    // Rejected below.
  }
  throw new HttpError(400, "Upload a photograph.");
}

export async function staffShipping(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "shipping.write");
  if (!actor) return null;
  const rates = await prisma.shippingRate.findMany({
    include: { method: true, zone: true },
    orderBy: { zone: { name: "asc" } },
  });
  return rates.map(presentShippingRate);
}

const shippingSchema = z.object({
  priceFils: z.number().int().min(0).max(5_000_000),
  freeOverFils: z
    .number()
    .int()
    .min(0)
    .max(50_000_000)
    .nullable()
    .optional(),
  estimatedMinDays: z.number().int().min(0).max(60).optional(),
  estimatedMaxDays: z.number().int().min(0).max(90).optional(),
  codAllowed: z.boolean().optional(),
});

export async function updateStaffShipping(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "shipping.write");
  if (!actor) return null;
  const input = shippingSchema.parse(req.body);
  if (input.priceFils % 100 !== 0)
    throw new HttpError(400, "Enter the delivery fee in whole dirhams.");
  if (
    input.freeOverFils != null &&
    input.freeOverFils % 100 !== 0
  ) {
    throw new HttpError(
      400,
      "Enter the free-delivery threshold in whole dirhams.",
    );
  }
  const existing = await prisma.shippingRate.findUnique({
    where: { id },
    include: { method: true, zone: true },
  });
  if (!existing) throw new HttpError(404, "That delivery is not on the desk.");

  const minDays = input.estimatedMinDays ?? existing.method.estimatedMinDays;
  const maxDays = input.estimatedMaxDays ?? existing.method.estimatedMaxDays;
  if (maxDays < minDays) {
    throw new HttpError(
      400,
      "The longest delivery day cannot be earlier than the shortest.",
    );
  }
  const freeOverFils =
    input.freeOverFils === undefined
      ? existing.freeOverFils
      : input.freeOverFils;
  const codAllowed = input.codAllowed ?? existing.method.codAllowed;
  const unchanged =
    existing.priceFils === input.priceFils &&
    existing.freeOverFils === freeOverFils &&
    existing.method.estimatedMinDays === minDays &&
    existing.method.estimatedMaxDays === maxDays &&
    existing.method.codAllowed === codAllowed;
  if (unchanged) return presentShippingRate(existing);

  const rate = await prisma.$transaction(async (tx) => {
    await tx.shippingMethod.update({
      where: { id: existing.methodId },
      data: {
        estimatedMinDays: minDays,
        estimatedMaxDays: maxDays,
        codAllowed,
      },
    });
    return tx.shippingRate.update({
      where: { id: existing.id },
      data: { priceFils: input.priceFils, freeOverFils },
      include: { method: true, zone: true },
    });
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "shipping.rate",
      entityType: "ShippingRate",
      entityId: rate.id,
      metadata: {
        zone: rate.zone.name,
        fromPriceFils: existing.priceFils,
        toPriceFils: rate.priceFils,
        freeOverFils: rate.freeOverFils,
        minDays: rate.method.estimatedMinDays,
        maxDays: rate.method.estimatedMaxDays,
        codAllowed: rate.method.codAllowed,
      },
      ip: req.ip,
    },
  });
  return presentShippingRate(rate);
}

function presentShippingRate(rate: {
  id: string;
  priceFils: number;
  freeOverFils: number | null;
  method: {
    name: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
    codAllowed: boolean;
  };
  zone: { name: string; emirate: string | null };
}) {
  return {
    id: rate.id,
    zone: rate.zone.name,
    emirate: rate.zone.emirate ?? "",
    method: rate.method.name,
    minDays: rate.method.estimatedMinDays,
    maxDays: rate.method.estimatedMaxDays,
    codAllowed: rate.method.codAllowed,
    priceFils: rate.priceFils,
    freeOverFils: rate.freeOverFils,
  };
}

const pageOrder = ["shipping", "returns", "privacy", "terms", "payment"];

function presentStaffPage(page: {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: string;
}) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    body: page.body,
    shown: page.status !== "DRAFT",
  };
}

export async function publicPage(slug: string) {
  const page = await prisma.cmsPage.findUnique({ where: { slug } });
  if (!page || page.status === "DRAFT")
    throw new HttpError(404, "This page is not in the house.");
  return { title: page.title, body: page.body };
}

export async function staffPages(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const rows = await prisma.cmsPage.findMany();
  return rows
    .slice()
    .sort((a, b) => pageOrder.indexOf(a.slug) - pageOrder.indexOf(b.slug))
    .map(presentStaffPage);
}

const pageSchema = z.object({
  shown: z.boolean(),
});

export async function updateStaffPage(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = pageSchema.parse(req.body);
  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That draft is not on the desk.");
  const shown = existing.status !== "DRAFT";
  if (shown === input.shown) return presentStaffPage(existing);
  const page = await prisma.cmsPage.update({
    where: { id: existing.id },
    data: { status: input.shown ? "PENDING_APPROVAL" : "DRAFT" },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "policy.draft",
      entityType: "CmsPage",
      entityId: page.id,
      metadata: { slug: page.slug, toShown: page.status !== "DRAFT" },
      ip: req.ip,
    },
  });
  return presentStaffPage(page);
}

const pageTitleSchema = z.object({
  title: z.string().trim().min(2).max(80),
});

export async function updateStaffPageTitle(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = pageTitleSchema.parse(req.body);
  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That draft is not on the desk.");
  if (existing.title === input.title) return presentStaffPage(existing);
  const page = await prisma.cmsPage.update({
    where: { id: existing.id },
    data: { title: input.title },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "policy.title",
      entityType: "CmsPage",
      entityId: page.id,
      metadata: { slug: page.slug },
      ip: req.ip,
    },
  });
  return presentStaffPage(page);
}

const pageLineSchema = z.object({
  body: z.string().trim().min(8).max(800),
});

export async function updateStaffPageLine(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = pageLineSchema.parse(req.body);
  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That draft is not on the desk.");
  if (existing.body === input.body) return presentStaffPage(existing);
  const page = await prisma.cmsPage.update({
    where: { id: existing.id },
    data: { body: input.body },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "policy.line",
      entityType: "CmsPage",
      entityId: page.id,
      metadata: { slug: page.slug },
      ip: req.ip,
    },
  });
  return presentStaffPage(page);
}

function readClosed(value: unknown) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "closed" in value &&
    value.closed === true,
  );
}

export async function houseClosed() {
  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: ["maintenance", "storeOpen"] } },
  });
  const maintenance = settings.find((setting) => setting.key === "maintenance");
  const storeOpen = settings.find((setting) => setting.key === "storeOpen");
  return readClosed(maintenance?.value) || storeOpen?.value === false;
}

export async function publicMaintenance() {
  return { closed: await houseClosed() };
}

export async function staffMaintenance(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "settings.write");
  if (!actor) return null;
  return publicMaintenance();
}

const maintenanceSchema = z.object({
  closed: z.boolean(),
});

export async function updateStaffMaintenance(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "settings.write");
  if (!actor) return null;
  const input = maintenanceSchema.parse(req.body);
  const existing = await houseClosed();
  if (existing === input.closed) return { closed: existing };
  await prisma.storeSetting.upsert({
    where: { key: "maintenance" },
    update: { value: { closed: input.closed } },
    create: { key: "maintenance", value: { closed: input.closed } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "settings.maintenance",
      entityType: "StoreSetting",
      entityId: "maintenance",
      metadata: { toClosed: input.closed },
      ip: req.ip,
    },
  });
  return { closed: input.closed };
}

const houseHours = "Daily from 10:00 AM to 10:00 PM.";

function readHours(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseHours;
  const line = value.line;
  return typeof line === "string" && line.trim().length >= 8
    ? line
    : houseHours;
}

export async function publicHours() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "hours" },
  });
  return { line: readHours(setting?.value) };
}

export async function staffHours(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicHours();
}

const hoursSchema = z.object({
  line: z.string().trim().min(8).max(160),
});

export async function updateStaffHours(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = hoursSchema.parse(req.body);
  const current = await publicHours();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "hours" },
    update: { value: { line: input.line } },
    create: { key: "hours", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "hours.line",
      entityType: "StoreSetting",
      entityId: "hours",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAddress =
  "Boutique M01, 3 Floor, Abu Hail Center, Dubai, United Arab Emirates.";

function readAddress(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAddress;
  const line = value.line;
  return typeof line === "string" && line.trim().length >= 8
    ? line
    : houseAddress;
}

export async function publicAddress() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "address" },
  });
  return { line: readAddress(setting?.value) };
}

export async function staffAddress(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAddress();
}

const addressSchema = z.object({
  line: z.string().trim().min(8).max(160),
});

export async function updateStaffAddress(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = addressSchema.parse(req.body);
  const current = await publicAddress();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "address" },
    update: { value: { line: input.line } },
    create: { key: "address", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "address.line",
      entityType: "StoreSetting",
      entityId: "address",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const housePhone = "+971 50 540 6077";

function usablePhone(line: string) {
  const digits = line.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function readPhone(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return housePhone;
  const line = value.line;
  if (typeof line !== "string") return housePhone;
  const trimmed = line.trim();
  return trimmed.length >= 8 && trimmed.length <= 40 && usablePhone(trimmed)
    ? trimmed
    : housePhone;
}

export async function publicPhone() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "phone" },
  });
  return { line: readPhone(setting?.value) };
}

export async function staffPhone(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicPhone();
}

const phoneSchema = z.object({
  line: z.string().trim().min(8).max(40),
});

export async function updateStaffPhone(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = phoneSchema.parse(req.body);
  if (!usablePhone(input.line))
    throw new HttpError(400, "Write the phone with the country code.");
  const current = await publicPhone();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "phone" },
    update: { value: { line: input.line } },
    create: { key: "phone", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "phone.line",
      entityType: "StoreSetting",
      entityId: "phone",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseInstagram = "https://www.instagram.com/peris_uae/";

function usableInstagram(line: string) {
  try {
    const url = new URL(line);
    if (url.protocol !== "https:") return false;
    if (
      url.hostname !== "www.instagram.com" &&
      url.hostname !== "instagram.com"
    )
      return false;
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9._]{2,30}$/.test(handle);
  } catch {
    return false;
  }
}

function readInstagram(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseInstagram;
  const line = value.line;
  if (typeof line !== "string") return houseInstagram;
  const trimmed = line.trim();
  return trimmed.length <= 120 && usableInstagram(trimmed)
    ? trimmed
    : houseInstagram;
}

export async function publicInstagram() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "instagram" },
  });
  return { line: readInstagram(setting?.value) };
}

export async function staffInstagram(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicInstagram();
}

const instagramSchema = z.object({
  line: z.string().trim().min(8).max(120),
});

export async function updateStaffInstagram(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = instagramSchema.parse(req.body);
  if (!usableInstagram(input.line))
    throw new HttpError(400, "Write the Instagram address.");
  const current = await publicInstagram();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "instagram" },
    update: { value: { line: input.line } },
    create: { key: "instagram", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "instagram.line",
      entityType: "StoreSetting",
      entityId: "instagram",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFacebook = "https://www.facebook.com/perisdubai";

function usableFacebook(line: string) {
  try {
    const url = new URL(line);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "www.facebook.com" && url.hostname !== "facebook.com")
      return false;
    const page = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9.]{2,50}$/.test(page);
  } catch {
    return false;
  }
}

function readFacebook(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFacebook;
  const line = value.line;
  if (typeof line !== "string") return houseFacebook;
  const trimmed = line.trim();
  return trimmed.length <= 120 && usableFacebook(trimmed)
    ? trimmed
    : houseFacebook;
}

export async function publicFacebook() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "facebook" },
  });
  return { line: readFacebook(setting?.value) };
}

export async function staffFacebook(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFacebook();
}

const facebookSchema = z.object({
  line: z.string().trim().min(8).max(120),
});

export async function updateStaffFacebook(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = facebookSchema.parse(req.body);
  if (!usableFacebook(input.line))
    throw new HttpError(400, "Write the Facebook address.");
  const current = await publicFacebook();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "facebook" },
    update: { value: { line: input.line } },
    create: { key: "facebook", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "facebook.line",
      entityType: "StoreSetting",
      entityId: "facebook",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseMaps = "https://maps.app.goo.gl/YdjuY6Nqnad2rpD36";

function usableMaps(line: string) {
  try {
    const url = new URL(line);
    if (url.protocol !== "https:") return false;
    const token = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (url.hostname === "share.google" || url.hostname === "maps.app.goo.gl")
      return /^[A-Za-z0-9_-]{4,80}$/.test(token);
    if (url.hostname === "maps.google.com")
      return url.pathname.length > 1 || url.search.length > 1;
    if (url.hostname === "www.google.com" || url.hostname === "google.com")
      return url.pathname.startsWith("/maps");
    return false;
  } catch {
    return false;
  }
}

function readMaps(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseMaps;
  const line = value.line;
  if (typeof line !== "string") return houseMaps;
  const trimmed = line.trim();
  return trimmed.length <= 200 && usableMaps(trimmed) ? trimmed : houseMaps;
}

export async function publicMaps() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "maps" },
  });
  return { line: readMaps(setting?.value) };
}

export async function staffMaps(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicMaps();
}

const mapsSchema = z.object({
  line: z.string().trim().min(8).max(200),
});

export async function updateStaffMaps(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = mapsSchema.parse(req.body);
  if (!usableMaps(input.line))
    throw new HttpError(400, "Write the Google Maps address.");
  const current = await publicMaps();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "maps" },
    update: { value: { line: input.line } },
    create: { key: "maps", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "maps.line",
      entityType: "StoreSetting",
      entityId: "maps",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseParent = "Lamasat Jawhareya";

function usableParent(line: string) {
  return /^[A-Za-z][A-Za-z .'-]{1,39}$/.test(line);
}

function readParent(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseParent;
  const line = value.line;
  if (typeof line !== "string") return houseParent;
  const trimmed = line.trim();
  return trimmed.length <= 40 && usableParent(trimmed) ? trimmed : houseParent;
}

export async function publicParent() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "parent" },
  });
  return { line: readParent(setting?.value) };
}

export async function staffParent(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicParent();
}

const parentSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffParent(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = parentSchema.parse(req.body);
  if (!usableParent(input.line))
    throw new HttpError(400, "Write the parent house.");
  const current = await publicParent();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "parent" },
    update: { value: { line: input.line } },
    create: { key: "parent", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "parent.line",
      entityType: "StoreSetting",
      entityId: "parent",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseStory =
  "Born in the heart of Dubai under the umbrella of 'Lamasat Jawhareya', PERIS is the ultimate destination for the modern woman seeking refinement and exclusivity. We don’t just tailor Abayas; we craft wearable art that reflects your personality. Guided by our Master Tailors and a steadfast commitment to precision in every cut and stitch, we guarantee a flawless finish that rivals the world’s leading luxury brands. At PERIS, we believe that true essence lies in the details.";

function usableStory(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 800 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readStory(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseStory;
  const line = value.line;
  if (typeof line !== "string") return houseStory;
  const trimmed = line.trim();
  return usableStory(trimmed) ? trimmed : houseStory;
}

export async function publicStory() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "story" },
  });
  return { line: readStory(setting?.value) };
}

export async function staffStory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicStory();
}

const storySchema = z.object({
  line: z.string().trim().min(40).max(800),
});

export async function updateStaffStory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = storySchema.parse(req.body);
  if (!usableStory(input.line))
    throw new HttpError(400, "Write the about story.");
  const current = await publicStory();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "story" },
    update: { value: { line: input.line } },
    create: { key: "story", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "story.line",
      entityType: "StoreSetting",
      entityId: "story",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseWelcome =
  "We are always delighted to welcome you at our boutique or answer your inquiries online. Book your appointment today for a fitting or a design consultation.";

function usableWelcome(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readWelcome(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseWelcome;
  const line = value.line;
  if (typeof line !== "string") return houseWelcome;
  const trimmed = line.trim();
  return usableWelcome(trimmed) ? trimmed : houseWelcome;
}

export async function publicWelcome() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "welcome" },
  });
  return { line: readWelcome(setting?.value) };
}

export async function staffWelcome(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicWelcome();
}

const welcomeSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffWelcome(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = welcomeSchema.parse(req.body);
  if (!usableWelcome(input.line))
    throw new HttpError(400, "Write the contact welcome.");
  const current = await publicWelcome();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "welcome" },
    update: { value: { line: input.line } },
    create: { key: "welcome", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "welcome.line",
      entityType: "StoreSetting",
      entityId: "welcome",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseHero = "Elegance, Meticulously Tailored.";

function usableHero(line: string) {
  return (
    line.length >= 12 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*\.$/.test(line)
  );
}

function readHero(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseHero;
  const line = value.line;
  if (typeof line !== "string") return houseHero;
  const trimmed = line.trim();
  return usableHero(trimmed) ? trimmed : houseHero;
}

export async function publicHero() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "hero" },
  });
  return { line: readHero(setting?.value) };
}

export async function staffHero(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicHero();
}

const heroSchema = z.object({
  line: z.string().trim().min(12).max(80),
});

export async function updateStaffHero(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = heroSchema.parse(req.body);
  if (!usableHero(input.line))
    throw new HttpError(400, "Write the homepage line.");
  const current = await publicHero();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "hero" },
    update: { value: { line: input.line } },
    create: { key: "hero", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "hero.line",
      entityType: "StoreSetting",
      entityId: "hero",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseIntro =
  "Welcome to PERIS, where the rich heritage of the Khaleeji Abaya meets contemporary sophistication. Discover exclusive designs and premium fabrics, carefully selected to reflect your unique beauty and individuality.";

function usableIntro(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readIntro(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseIntro;
  const line = value.line;
  if (typeof line !== "string") return houseIntro;
  const trimmed = line.trim();
  return usableIntro(trimmed) ? trimmed : houseIntro;
}

export async function publicIntro() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "intro" },
  });
  return { line: readIntro(setting?.value) };
}

export async function staffIntro(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicIntro();
}

const introSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffIntro(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = introSchema.parse(req.body);
  if (!usableIntro(input.line))
    throw new HttpError(400, "Write the homepage introduction.");
  const current = await publicIntro();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "intro" },
    update: { value: { line: input.line } },
    create: { key: "intro", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "intro.line",
      entityType: "StoreSetting",
      entityId: "intro",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseHeading = "Wearable art, cut in Dubai";

function usableHeading(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readHeading(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseHeading;
  const line = value.line;
  if (typeof line !== "string") return houseHeading;
  const trimmed = line.trim();
  return usableHeading(trimmed) ? trimmed : houseHeading;
}

export async function publicHeading() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "heading" },
  });
  return { line: readHeading(setting?.value) };
}

export async function staffHeading(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicHeading();
}

const headingSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffHeading(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = headingSchema.parse(req.body);
  if (!usableHeading(input.line))
    throw new HttpError(400, "Write the story heading.");
  const current = await publicHeading();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "heading" },
    update: { value: { line: input.line } },
    create: { key: "heading", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "heading.line",
      entityType: "StoreSetting",
      entityId: "heading",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFitting = "What the fitting room is built on";

function usableFitting(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readFitting(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFitting;
  const line = value.line;
  if (typeof line !== "string") return houseFitting;
  const trimmed = line.trim();
  return usableFitting(trimmed) ? trimmed : houseFitting;
}

export async function publicFitting() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "fitting" },
  });
  return { line: readFitting(setting?.value) };
}

export async function staffFitting(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFitting();
}

const fittingSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFitting(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = fittingSchema.parse(req.body);
  if (!usableFitting(input.line))
    throw new HttpError(400, "Write the fitting heading.");
  const current = await publicFitting();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "fitting" },
    update: { value: { line: input.line } },
    create: { key: "fitting", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "fitting.line",
      entityType: "StoreSetting",
      entityId: "fitting",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseTailoring = "Bespoke Tailoring";

function usableTailoring(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readTailoring(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseTailoring;
  const line = value.line;
  if (typeof line !== "string") return houseTailoring;
  const trimmed = line.trim();
  return usableTailoring(trimmed) ? trimmed : houseTailoring;
}

export async function publicTailoring() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "tailoring" },
  });
  return { line: readTailoring(setting?.value) };
}

export async function staffTailoring(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicTailoring();
}

const tailoringSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffTailoring(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = tailoringSchema.parse(req.body);
  if (!usableTailoring(input.line))
    throw new HttpError(400, "Write the tailoring title.");
  const current = await publicTailoring();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "tailoring" },
    update: { value: { line: input.line } },
    create: { key: "tailoring", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "tailoring.line",
      entityType: "StoreSetting",
      entityId: "tailoring",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const housePrecision =
  "Abayas custom-tailored to your exact measurements and unique taste with unparalleled precision.";

function usablePrecision(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readPrecision(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return housePrecision;
  const line = value.line;
  if (typeof line !== "string") return housePrecision;
  const trimmed = line.trim();
  return usablePrecision(trimmed) ? trimmed : housePrecision;
}

export async function publicPrecision() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "precision" },
  });
  return { line: readPrecision(setting?.value) };
}

export async function staffPrecision(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicPrecision();
}

const precisionSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffPrecision(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = precisionSchema.parse(req.body);
  if (!usablePrecision(input.line))
    throw new HttpError(400, "Write the tailoring line.");
  const current = await publicPrecision();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "precision" },
    update: { value: { line: input.line } },
    create: { key: "precision", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "precision.line",
      entityType: "StoreSetting",
      entityId: "precision",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const housePremium = "Premium Fabrics";

function usablePremium(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readPremium(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return housePremium;
  const line = value.line;
  if (typeof line !== "string") return housePremium;
  const trimmed = line.trim();
  return usablePremium(trimmed) ? trimmed : housePremium;
}

export async function publicPremium() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "premium" },
  });
  return { line: readPremium(setting?.value) };
}

export async function staffPremium(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicPremium();
}

const premiumSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffPremium(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = premiumSchema.parse(req.body);
  if (!usablePremium(input.line))
    throw new HttpError(400, "Write the premium title.");
  const current = await publicPremium();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "premium" },
    update: { value: { line: input.line } },
    create: { key: "premium", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "premium.line",
      entityType: "StoreSetting",
      entityId: "premium",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseHandpick =
  "We handpick the finest fabrics and threads from top-tier suppliers to ensure lasting comfort and an unforgettable look.";

function usableHandpick(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readHandpick(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseHandpick;
  const line = value.line;
  if (typeof line !== "string") return houseHandpick;
  const trimmed = line.trim();
  return usableHandpick(trimmed) ? trimmed : houseHandpick;
}

export async function publicHandpick() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "handpick" },
  });
  return { line: readHandpick(setting?.value) };
}

export async function staffHandpick(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicHandpick();
}

const handpickSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffHandpick(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = handpickSchema.parse(req.body);
  if (!usableHandpick(input.line))
    throw new HttpError(400, "Write the premium line.");
  const current = await publicHandpick();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "handpick" },
    update: { value: { line: input.line } },
    create: { key: "handpick", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "handpick.line",
      entityType: "StoreSetting",
      entityId: "handpick",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCraftsmanship = "Master Craftsmanship";

function usableCraftsmanship(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readCraftsmanship(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCraftsmanship;
  const line = value.line;
  if (typeof line !== "string") return houseCraftsmanship;
  const trimmed = line.trim();
  return usableCraftsmanship(trimmed) ? trimmed : houseCraftsmanship;
}

export async function publicCraftsmanship() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "craftsmanship" },
  });
  return { line: readCraftsmanship(setting?.value) };
}

export async function staffCraftsmanship(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCraftsmanship();
}

const craftsmanshipSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffCraftsmanship(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = craftsmanshipSchema.parse(req.body);
  if (!usableCraftsmanship(input.line))
    throw new HttpError(400, "Write the craftsmanship title.");
  const current = await publicCraftsmanship();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "craftsmanship" },
    update: { value: { line: input.line } },
    create: { key: "craftsmanship", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "craftsmanship.line",
      entityType: "StoreSetting",
      entityId: "craftsmanship",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseDetail =
  "Exceptional attention to detail, from the very first pattern cut to the final placement of our signature tag.";

function usableDetail(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readDetail(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseDetail;
  const line = value.line;
  if (typeof line !== "string") return houseDetail;
  const trimmed = line.trim();
  return usableDetail(trimmed) ? trimmed : houseDetail;
}

export async function publicDetail() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "detail" },
  });
  return { line: readDetail(setting?.value) };
}

export async function staffDetail(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicDetail();
}

const detailSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffDetail(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = detailSchema.parse(req.body);
  if (!usableDetail(input.line))
    throw new HttpError(400, "Write the craftsmanship line.");
  const current = await publicDetail();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "detail" },
    update: { value: { line: input.line } },
    create: { key: "detail", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "detail.line",
      entityType: "StoreSetting",
      entityId: "detail",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSample = "Sample notes";

function usableSample(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readSample(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSample;
  const line = value.line;
  if (typeof line !== "string") return houseSample;
  const trimmed = line.trim();
  return usableSample(trimmed) ? trimmed : houseSample;
}

export async function publicSample() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "sample" },
  });
  return { line: readSample(setting?.value) };
}

export async function staffSample(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSample();
}

const sampleSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffSample(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = sampleSchema.parse(req.body);
  if (!usableSample(input.line))
    throw new HttpError(400, "Write the sample notes.");
  const current = await publicSample();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "sample" },
    update: { value: { line: input.line } },
    create: { key: "sample", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "sample.line",
      entityType: "StoreSetting",
      entityId: "sample",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseHem =
  "The hem sat exactly where I asked, and the cloth stayed quiet through a long evening.";

function usableHem(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readHem(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseHem;
  const line = value.line;
  if (typeof line !== "string") return houseHem;
  const trimmed = line.trim();
  return usableHem(trimmed) ? trimmed : houseHem;
}

export async function publicHem() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "hem" },
  });
  return { line: readHem(setting?.value) };
}

export async function staffHem(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicHem();
}

const hemSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffHem(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = hemSchema.parse(req.body);
  if (!usableHem(input.line)) throw new HttpError(400, "Write the first note.");
  const current = await publicHem();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "hem" },
    update: { value: { line: input.line } },
    create: { key: "hem", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "hem.line",
      entityType: "StoreSetting",
      entityId: "hem",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSketch =
  "I sent a sketch on a Tuesday. The fitting in Abu Hail felt like the drawing had learned how to move.";

function usableSketch(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSketch(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSketch;
  const line = value.line;
  if (typeof line !== "string") return houseSketch;
  const trimmed = line.trim();
  return usableSketch(trimmed) ? trimmed : houseSketch;
}

export async function publicSketch() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "sketch" },
  });
  return { line: readSketch(setting?.value) };
}

export async function staffSketch(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSketch();
}

const sketchSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffSketch(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = sketchSchema.parse(req.body);
  if (!usableSketch(input.line))
    throw new HttpError(400, "Write the second note.");
  const current = await publicSketch();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "sketch" },
    update: { value: { line: input.line } },
    create: { key: "sketch", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "sketch.line",
      entityType: "StoreSetting",
      entityId: "sketch",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseDay =
  "A day abaya I can wear to the office and still want to wear to dinner.";

function usableDay(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readDay(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseDay;
  const line = value.line;
  if (typeof line !== "string") return houseDay;
  const trimmed = line.trim();
  return usableDay(trimmed) ? trimmed : houseDay;
}

export async function publicDay() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "day" },
  });
  return { line: readDay(setting?.value) };
}

export async function staffDay(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicDay();
}

const daySchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffDay(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = daySchema.parse(req.body);
  if (!usableDay(input.line)) throw new HttpError(400, "Write the third note.");
  const current = await publicDay();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "day" },
    update: { value: { line: input.line } },
    create: { key: "day", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "day.line",
      entityType: "StoreSetting",
      entityId: "day",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseNotes = "Notes from the house";

function usableNotes(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readNotes(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseNotes;
  const line = value.line;
  if (typeof line !== "string") return houseNotes;
  const trimmed = line.trim();
  return usableNotes(trimmed) ? trimmed : houseNotes;
}

export async function publicNotes() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "notes" },
  });
  return { line: readNotes(setting?.value) };
}

export async function staffNotes(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicNotes();
}

const notesSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffNotes(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = notesSchema.parse(req.body);
  if (!usableNotes(input.line))
    throw new HttpError(400, "Write the notes heading.");
  const current = await publicNotes();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "notes" },
    update: { value: { line: input.line } },
    create: { key: "notes", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "notes.line",
      entityType: "StoreSetting",
      entityId: "notes",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseList =
  "New cloth, private appointments, and the occasional evening piece. The list is kept at the desk until email delivery is connected.";

function usableList(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readList(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseList;
  const line = value.line;
  if (typeof line !== "string") return houseList;
  const trimmed = line.trim();
  return usableList(trimmed) ? trimmed : houseList;
}

export async function publicList() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "list" },
  });
  return { line: readList(setting?.value) };
}

export async function staffList(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicList();
}

const listSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffList(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = listSchema.parse(req.body);
  if (!usableList(input.line))
    throw new HttpError(400, "Write the notes line.");
  const current = await publicList();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "list" },
    update: { value: { line: input.line } },
    create: { key: "list", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "list.line",
      entityType: "StoreSetting",
      entityId: "list",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFooter =
  "Luxury abayas and bespoke tailoring from Dubai, a house of Lamasat Jawhareya.";

function usableFooter(line: string) {
  return (
    line.length >= 40 &&
    line.length <= 400 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFooter(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFooter;
  const line = value.line;
  if (typeof line !== "string") return houseFooter;
  const trimmed = line.trim();
  return usableFooter(trimmed) ? trimmed : houseFooter;
}

export async function publicFooter() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footer" },
  });
  return { line: readFooter(setting?.value) };
}

export async function staffFooter(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFooter();
}

const footerSchema = z.object({
  line: z.string().trim().min(40).max(400),
});

export async function updateStaffFooter(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footerSchema.parse(req.body);
  if (!usableFooter(input.line))
    throw new HttpError(400, "Write the footer line.");
  const current = await publicFooter();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footer" },
    update: { value: { line: input.line } },
    create: { key: "footer", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footer.line",
      entityType: "StoreSetting",
      entityId: "footer",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseWays = "Three ways to wear the house";

function usableWays(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readWays(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseWays;
  const line = value.line;
  if (typeof line !== "string") return houseWays;
  const trimmed = line.trim();
  return usableWays(trimmed) ? trimmed : houseWays;
}

export async function publicWays() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "ways" },
  });
  return { line: readWays(setting?.value) };
}

export async function staffWays(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicWays();
}

const waysSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffWays(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = waysSchema.parse(req.body);
  if (!usableWays(input.line))
    throw new HttpError(400, "Write the collection heading.");
  const current = await publicWays();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "ways" },
    update: { value: { line: input.line } },
    create: { key: "ways", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ways.line",
      entityType: "StoreSetting",
      entityId: "ways",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const housePieces = "Pieces the boutique keeps close";

function usablePieces(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line)
  );
}

function readPieces(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return housePieces;
  const line = value.line;
  if (typeof line !== "string") return housePieces;
  const trimmed = line.trim();
  return usablePieces(trimmed) ? trimmed : housePieces;
}

export async function publicPieces() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "pieces" },
  });
  return { line: readPieces(setting?.value) };
}

export async function staffPieces(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicPieces();
}

const piecesSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffPieces(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = piecesSchema.parse(req.body);
  if (!usablePieces(input.line))
    throw new HttpError(400, "Write the pieces heading.");
  const current = await publicPieces();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "pieces" },
    update: { value: { line: input.line } },
    create: { key: "pieces", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "pieces.line",
      entityType: "StoreSetting",
      entityId: "pieces",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFollow = "Follow @peris_uae";

function usableFollow(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z0-9, .@'_-]*[A-Za-z0-9]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFollow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFollow;
  const line = value.line;
  if (typeof line !== "string") return houseFollow;
  const trimmed = line.trim();
  return usableFollow(trimmed) ? trimmed : houseFollow;
}

export async function publicFollow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "follow" },
  });
  return { line: readFollow(setting?.value) };
}

export async function staffFollow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFollow();
}

const followSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFollow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = followSchema.parse(req.body);
  if (!usableFollow(input.line))
    throw new HttpError(400, "Write the follow heading.");
  const current = await publicFollow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "follow" },
    update: { value: { line: input.line } },
    create: { key: "follow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "follow.line",
      entityType: "StoreSetting",
      entityId: "follow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCity = "Dubai";

function usableCity(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readCity(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCity;
  const line = value.line;
  if (typeof line !== "string") return houseCity;
  const trimmed = line.trim();
  return usableCity(trimmed) ? trimmed : houseCity;
}

export async function publicCity() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "city" },
  });
  return { line: readCity(setting?.value) };
}

export async function staffCity(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCity();
}

const citySchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffCity(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = citySchema.parse(req.body);
  if (!usableCity(input.line))
    throw new HttpError(400, "Write the city line.");
  const current = await publicCity();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "city" },
    update: { value: { line: input.line } },
    create: { key: "city", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "city.line",
      entityType: "StoreSetting",
      entityId: "city",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCollect = "Collections";

function usableCollect(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readCollect(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCollect;
  const line = value.line;
  if (typeof line !== "string") return houseCollect;
  const trimmed = line.trim();
  return usableCollect(trimmed) ? trimmed : houseCollect;
}

export async function publicCollect() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "collect" },
  });
  return { line: readCollect(setting?.value) };
}

export async function staffCollect(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCollect();
}

const collectSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffCollect(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = collectSchema.parse(req.body);
  if (!usableCollect(input.line))
    throw new HttpError(400, "Write the collections eyebrow.");
  const current = await publicCollect();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "collect" },
    update: { value: { line: input.line } },
    create: { key: "collect", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "collect.line",
      entityType: "StoreSetting",
      entityId: "collect",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCommission = "Commission";

function usableCommission(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readCommission(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCommission;
  const line = value.line;
  if (typeof line !== "string") return houseCommission;
  const trimmed = line.trim();
  return usableCommission(trimmed) ? trimmed : houseCommission;
}

export async function publicCommission() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "commission" },
  });
  return { line: readCommission(setting?.value) };
}

export async function staffCommission(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCommission();
}

const commissionSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffCommission(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = commissionSchema.parse(req.body);
  if (!usableCommission(input.line))
    throw new HttpError(400, "Write the commission eyebrow.");
  const current = await publicCommission();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "commission" },
    update: { value: { line: input.line } },
    create: { key: "commission", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "commission.line",
      entityType: "StoreSetting",
      entityId: "commission",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSellers = "Best sellers";

function usableSellers(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSellers(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSellers;
  const line = value.line;
  if (typeof line !== "string") return houseSellers;
  const trimmed = line.trim();
  return usableSellers(trimmed) ? trimmed : houseSellers;
}

export async function publicSellers() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "sellers" },
  });
  return { line: readSellers(setting?.value) };
}

export async function staffSellers(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSellers();
}

const sellersSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffSellers(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = sellersSchema.parse(req.body);
  if (!usableSellers(input.line))
    throw new HttpError(400, "Write the best sellers eyebrow.");
  const current = await publicSellers();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "sellers" },
    update: { value: { line: input.line } },
    create: { key: "sellers", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "sellers.line",
      entityType: "StoreSetting",
      entityId: "sellers",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseDebut = "New arrival";

function usableDebut(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readDebut(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseDebut;
  const line = value.line;
  if (typeof line !== "string") return houseDebut;
  const trimmed = line.trim();
  return usableDebut(trimmed) ? trimmed : houseDebut;
}

export async function publicDebut() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "debut" },
  });
  return { line: readDebut(setting?.value) };
}

export async function staffDebut(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicDebut();
}

const debutSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffDebut(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = debutSchema.parse(req.body);
  if (!usableDebut(input.line))
    throw new HttpError(400, "Write the new arrival eyebrow.");
  const current = await publicDebut();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "debut" },
    update: { value: { line: input.line } },
    create: { key: "debut", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "debut.line",
      entityType: "StoreSetting",
      entityId: "debut",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAbode = "The house";

function usableAbode(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readAbode(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAbode;
  const line = value.line;
  if (typeof line !== "string") return houseAbode;
  const trimmed = line.trim();
  return usableAbode(trimmed) ? trimmed : houseAbode;
}

export async function publicAbode() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "abode" },
  });
  return { line: readAbode(setting?.value) };
}

export async function staffAbode(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAbode();
}

const abodeSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffAbode(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = abodeSchema.parse(req.body);
  if (!usableAbode(input.line))
    throw new HttpError(400, "Write the house eyebrow.");
  const current = await publicAbode();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "abode" },
    update: { value: { line: input.line } },
    create: { key: "abode", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "abode.line",
      entityType: "StoreSetting",
      entityId: "abode",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseWhy = "Why PERIS";

function usableWhy(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readWhy(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseWhy;
  const line = value.line;
  if (typeof line !== "string") return houseWhy;
  const trimmed = line.trim();
  return usableWhy(trimmed) ? trimmed : houseWhy;
}

export async function publicWhy() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "why" },
  });
  return { line: readWhy(setting?.value) };
}

export async function staffWhy(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicWhy();
}

const whySchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffWhy(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = whySchema.parse(req.body);
  if (!usableWhy(input.line))
    throw new HttpError(400, "Write the why PERIS eyebrow.");
  const current = await publicWhy();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "why" },
    update: { value: { line: input.line } },
    create: { key: "why", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "why.line",
      entityType: "StoreSetting",
      entityId: "why",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSocial = "Instagram";

function usableSocial(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSocial(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSocial;
  const line = value.line;
  if (typeof line !== "string") return houseSocial;
  const trimmed = line.trim();
  return usableSocial(trimmed) ? trimmed : houseSocial;
}

export async function publicSocial() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "social" },
  });
  return { line: readSocial(setting?.value) };
}

export async function staffSocial(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSocial();
}

const socialSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffSocial(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = socialSchema.parse(req.body);
  if (!usableSocial(input.line))
    throw new HttpError(400, "Write the Instagram eyebrow.");
  const current = await publicSocial();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "social" },
    update: { value: { line: input.line } },
    create: { key: "social", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "social.line",
      entityType: "StoreSetting",
      entityId: "social",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseTestimonials = "Testimonials";

function usableTestimonials(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readTestimonials(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseTestimonials;
  const line = value.line;
  if (typeof line !== "string") return houseTestimonials;
  const trimmed = line.trim();
  return usableTestimonials(trimmed) ? trimmed : houseTestimonials;
}

export async function publicTestimonials() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "testimonials" },
  });
  return { line: readTestimonials(setting?.value) };
}

export async function staffTestimonials(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicTestimonials();
}

const testimonialsSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffTestimonials(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = testimonialsSchema.parse(req.body);
  if (!usableTestimonials(input.line))
    throw new HttpError(400, "Write the Testimonials eyebrow.");
  const current = await publicTestimonials();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "testimonials" },
    update: { value: { line: input.line } },
    create: { key: "testimonials", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "testimonials.line",
      entityType: "StoreSetting",
      entityId: "testimonials",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCorrespondence = "Correspondence";

function usableCorrespondence(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readCorrespondence(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCorrespondence;
  const line = value.line;
  if (typeof line !== "string") return houseCorrespondence;
  const trimmed = line.trim();
  return usableCorrespondence(trimmed) ? trimmed : houseCorrespondence;
}

export async function publicCorrespondence() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "correspondence" },
  });
  return { line: readCorrespondence(setting?.value) };
}

export async function staffCorrespondence(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCorrespondence();
}

const correspondenceSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffCorrespondence(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = correspondenceSchema.parse(req.body);
  if (!usableCorrespondence(input.line))
    throw new HttpError(400, "Write the Correspondence eyebrow.");
  const current = await publicCorrespondence();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "correspondence" },
    update: { value: { line: input.line } },
    create: { key: "correspondence", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "correspondence.line",
      entityType: "StoreSetting",
      entityId: "correspondence",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseReviewNote = "Sample, until verified reviews are published";

function usableReviewNote(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readReviewNote(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseReviewNote;
  const line = value.line;
  if (typeof line !== "string") return houseReviewNote;
  const trimmed = line.trim();
  return usableReviewNote(trimmed) ? trimmed : houseReviewNote;
}

export async function publicReviewNote() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "reviewnote" },
  });
  return { line: readReviewNote(setting?.value) };
}

export async function staffReviewNote(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicReviewNote();
}

const reviewNoteSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffReviewNote(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = reviewNoteSchema.parse(req.body);
  if (!usableReviewNote(input.line))
    throw new HttpError(400, "Write the sample review note.");
  const current = await publicReviewNote();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "reviewnote" },
    update: { value: { line: input.line } },
    create: { key: "reviewnote", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "reviewnote.line",
      entityType: "StoreSetting",
      entityId: "reviewnote",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseBeginCta = "Begin a commission";

function usableBeginCta(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readBeginCta(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseBeginCta;
  const line = value.line;
  if (typeof line !== "string") return houseBeginCta;
  const trimmed = line.trim();
  return usableBeginCta(trimmed) ? trimmed : houseBeginCta;
}

export async function publicBeginCta() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "begincta" },
  });
  return { line: readBeginCta(setting?.value) };
}

export async function staffBeginCta(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicBeginCta();
}

const beginCtaSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffBeginCta(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = beginCtaSchema.parse(req.body);
  if (!usableBeginCta(input.line))
    throw new HttpError(400, "Write the Begin a commission link text.");
  const current = await publicBeginCta();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "begincta" },
    update: { value: { line: input.line } },
    create: { key: "begincta", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "begincta.line",
      entityType: "StoreSetting",
      entityId: "begincta",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseViewEdit = "View the edit";

function usableViewEdit(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readViewEdit(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseViewEdit;
  const line = value.line;
  if (typeof line !== "string") return houseViewEdit;
  const trimmed = line.trim();
  return usableViewEdit(trimmed) ? trimmed : houseViewEdit;
}

export async function publicViewEdit() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "viewedit" },
  });
  return { line: readViewEdit(setting?.value) };
}

export async function staffViewEdit(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicViewEdit();
}

const viewEditSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffViewEdit(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = viewEditSchema.parse(req.body);
  if (!usableViewEdit(input.line))
    throw new HttpError(400, "Write the View the edit link text.");
  const current = await publicViewEdit();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "viewedit" },
    update: { value: { line: input.line } },
    create: { key: "viewedit", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "viewedit.line",
      entityType: "StoreSetting",
      entityId: "viewedit",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseViewPiece = "View the piece";

function usableViewPiece(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readViewPiece(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseViewPiece;
  const line = value.line;
  if (typeof line !== "string") return houseViewPiece;
  const trimmed = line.trim();
  return usableViewPiece(trimmed) ? trimmed : houseViewPiece;
}

export async function publicViewPiece() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "viewpiece" },
  });
  return { line: readViewPiece(setting?.value) };
}

export async function staffViewPiece(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicViewPiece();
}

const viewPieceSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffViewPiece(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = viewPieceSchema.parse(req.body);
  if (!usableViewPiece(input.line))
    throw new HttpError(400, "Write the View the piece link text.");
  const current = await publicViewPiece();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "viewpiece" },
    update: { value: { line: input.line } },
    create: { key: "viewpiece", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "viewpiece.line",
      entityType: "StoreSetting",
      entityId: "viewpiece",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseReadStory = "Read the story";

function usableReadStory(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readReadStory(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseReadStory;
  const line = value.line;
  if (typeof line !== "string") return houseReadStory;
  const trimmed = line.trim();
  return usableReadStory(trimmed) ? trimmed : houseReadStory;
}

export async function publicReadStory() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "readstory" },
  });
  return { line: readReadStory(setting?.value) };
}

export async function staffReadStory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicReadStory();
}

const readStorySchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffReadStory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = readStorySchema.parse(req.body);
  if (!usableReadStory(input.line))
    throw new HttpError(400, "Write the Read the story link text.");
  const current = await publicReadStory();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "readstory" },
    update: { value: { line: input.line } },
    create: { key: "readstory", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "readstory.line",
      entityType: "StoreSetting",
      entityId: "readstory",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseEmailLabel = "Email address";

function usableEmailLabel(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readEmailLabel(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseEmailLabel;
  const line = value.line;
  if (typeof line !== "string") return houseEmailLabel;
  const trimmed = line.trim();
  return usableEmailLabel(trimmed) ? trimmed : houseEmailLabel;
}

export async function publicEmailLabel() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "emaillabel" },
  });
  return { line: readEmailLabel(setting?.value) };
}

export async function staffEmailLabel(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicEmailLabel();
}

const emailLabelSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffEmailLabel(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = emailLabelSchema.parse(req.body);
  if (!usableEmailLabel(input.line))
    throw new HttpError(400, "Write the Newsletter email label.");
  const current = await publicEmailLabel();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "emaillabel" },
    update: { value: { line: input.line } },
    create: { key: "emaillabel", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "emaillabel.line",
      entityType: "StoreSetting",
      entityId: "emaillabel",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSubscribeButton = "Subscribe";

function usableSubscribeButton(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSubscribeButton(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSubscribeButton;
  const line = value.line;
  if (typeof line !== "string") return houseSubscribeButton;
  const trimmed = line.trim();
  return usableSubscribeButton(trimmed) ? trimmed : houseSubscribeButton;
}

export async function publicSubscribeButton() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "subscribebtn" },
  });
  return { line: readSubscribeButton(setting?.value) };
}

export async function staffSubscribeButton(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSubscribeButton();
}

const subscribeButtonSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffSubscribeButton(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = subscribeButtonSchema.parse(req.body);
  if (!usableSubscribeButton(input.line))
    throw new HttpError(400, "Write the Newsletter subscribe button.");
  const current = await publicSubscribeButton();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "subscribebtn" },
    update: { value: { line: input.line } },
    create: { key: "subscribebtn", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "subscribebtn.line",
      entityType: "StoreSetting",
      entityId: "subscribebtn",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseListMessage = "You are on the list. Email delivery is not connected.";

function usableListMessage(line: string) {
  return (
    line.length >= 20 &&
    line.length <= 120 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readListMessage(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseListMessage;
  const line = value.line;
  if (typeof line !== "string") return houseListMessage;
  const trimmed = line.trim();
  return usableListMessage(trimmed) ? trimmed : houseListMessage;
}

export async function publicListMessage() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "listmsg" },
  });
  return { line: readListMessage(setting?.value) };
}

export async function staffListMessage(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicListMessage();
}

const listMessageSchema = z.object({
  line: z.string().trim().min(20).max(120),
});

export async function updateStaffListMessage(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = listMessageSchema.parse(req.body);
  if (!usableListMessage(input.line))
    throw new HttpError(400, "Write the Newsletter list message.");
  const current = await publicListMessage();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "listmsg" },
    update: { value: { line: input.line } },
    create: { key: "listmsg", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "listmsg.line",
      entityType: "StoreSetting",
      entityId: "listmsg",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseEmailError = "Enter a valid email address.";

function usableEmailError(line: string) {
  return (
    line.length >= 20 &&
    line.length <= 120 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readEmailError(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseEmailError;
  const line = value.line;
  if (typeof line !== "string") return houseEmailError;
  const trimmed = line.trim();
  return usableEmailError(trimmed) ? trimmed : houseEmailError;
}

export async function publicEmailError() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "emailerr" },
  });
  return { line: readEmailError(setting?.value) };
}

export async function staffEmailError(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicEmailError();
}

const emailErrorSchema = z.object({
  line: z.string().trim().min(20).max(120),
});

export async function updateStaffEmailError(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = emailErrorSchema.parse(req.body);
  if (!usableEmailError(input.line))
    throw new HttpError(400, "Write the Newsletter email error.");
  const current = await publicEmailError();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "emailerr" },
    update: { value: { line: input.line } },
    create: { key: "emailerr", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "emailerr.line",
      entityType: "StoreSetting",
      entityId: "emailerr",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseNewsHeading = "Newsletter";

function usableNewsHeading(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readNewsHeading(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseNewsHeading;
  const line = value.line;
  if (typeof line !== "string") return houseNewsHeading;
  const trimmed = line.trim();
  return usableNewsHeading(trimmed) ? trimmed : houseNewsHeading;
}

export async function publicNewsHeading() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footnews" },
  });
  return { line: readNewsHeading(setting?.value) };
}

export async function staffNewsHeading(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicNewsHeading();
}

const newsHeadingSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffNewsHeading(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = newsHeadingSchema.parse(req.body);
  if (!usableNewsHeading(input.line))
    throw new HttpError(400, "Write the Footer newsletter heading.");
  const current = await publicNewsHeading();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footnews" },
    update: { value: { line: input.line } },
    create: { key: "footnews", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footnews.line",
      entityType: "StoreSetting",
      entityId: "footnews",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootEmail = "Email address";

function usableFootEmail(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootEmail(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootEmail;
  const line = value.line;
  if (typeof line !== "string") return houseFootEmail;
  const trimmed = line.trim();
  return usableFootEmail(trimmed) ? trimmed : houseFootEmail;
}

export async function publicFootEmail() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footemail" },
  });
  return { line: readFootEmail(setting?.value) };
}

export async function staffFootEmail(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootEmail();
}

const footEmailSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFootEmail(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footEmailSchema.parse(req.body);
  if (!usableFootEmail(input.line))
    throw new HttpError(400, "Write the Footer email placeholder.");
  const current = await publicFootEmail();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footemail" },
    update: { value: { line: input.line } },
    create: { key: "footemail", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footemail.line",
      entityType: "StoreSetting",
      entityId: "footemail",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootSub = "Subscribe";

function usableFootSub(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootSub(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootSub;
  const line = value.line;
  if (typeof line !== "string") return houseFootSub;
  const trimmed = line.trim();
  return usableFootSub(trimmed) ? trimmed : houseFootSub;
}

export async function publicFootSub() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footsub" },
  });
  return { line: readFootSub(setting?.value) };
}

export async function staffFootSub(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootSub();
}

const footSubSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFootSub(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footSubSchema.parse(req.body);
  if (!usableFootSub(input.line))
    throw new HttpError(400, "Write the Footer subscribe button.");
  const current = await publicFootSub();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footsub" },
    update: { value: { line: input.line } },
    create: { key: "footsub", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footsub.line",
      entityType: "StoreSetting",
      entityId: "footsub",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootList = "You are on the list. Email delivery is not connected.";

function usableFootList(line: string) {
  return (
    line.length >= 20 &&
    line.length <= 120 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootList(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootList;
  const line = value.line;
  if (typeof line !== "string") return houseFootList;
  const trimmed = line.trim();
  return usableFootList(trimmed) ? trimmed : houseFootList;
}

export async function publicFootList() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footlist" },
  });
  return { line: readFootList(setting?.value) };
}

export async function staffFootList(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootList();
}

const footListSchema = z.object({
  line: z.string().trim().min(20).max(120),
});

export async function updateStaffFootList(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footListSchema.parse(req.body);
  if (!usableFootList(input.line))
    throw new HttpError(400, "Write the Footer list message.");
  const current = await publicFootList();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footlist" },
    update: { value: { line: input.line } },
    create: { key: "footlist", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footlist.line",
      entityType: "StoreSetting",
      entityId: "footlist",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootError = "Enter a valid email address.";

function usableFootError(line: string) {
  return (
    line.length >= 20 &&
    line.length <= 120 &&
    /^[A-Za-z]/.test(line) &&
    /[.!?]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootError(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootError;
  const line = value.line;
  if (typeof line !== "string") return houseFootError;
  const trimmed = line.trim();
  return usableFootError(trimmed) ? trimmed : houseFootError;
}

export async function publicFootError() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footerr" },
  });
  return { line: readFootError(setting?.value) };
}

export async function staffFootError(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootError();
}

const footErrorSchema = z.object({
  line: z.string().trim().min(20).max(120),
});

export async function updateStaffFootError(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footErrorSchema.parse(req.body);
  if (!usableFootError(input.line))
    throw new HttpError(400, "Write the Footer email error.");
  const current = await publicFootError();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footerr" },
    update: { value: { line: input.line } },
    create: { key: "footerr", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footerr.line",
      entityType: "StoreSetting",
      entityId: "footerr",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootQuick = "Quick links";

function usableFootQuick(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootQuick(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootQuick;
  const line = value.line;
  if (typeof line !== "string") return houseFootQuick;
  const trimmed = line.trim();
  return usableFootQuick(trimmed) ? trimmed : houseFootQuick;
}

export async function publicFootQuick() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footquick" },
  });
  return { line: readFootQuick(setting?.value) };
}

export async function staffFootQuick(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootQuick();
}

const footQuickSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFootQuick(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footQuickSchema.parse(req.body);
  if (!usableFootQuick(input.line))
    throw new HttpError(400, "Write the Footer quick links heading.");
  const current = await publicFootQuick();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footquick" },
    update: { value: { line: input.line } },
    create: { key: "footquick", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footquick.line",
      entityType: "StoreSetting",
      entityId: "footquick",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootSupport = "Customer support";

function usableFootSupport(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootSupport(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootSupport;
  const line = value.line;
  if (typeof line !== "string") return houseFootSupport;
  const trimmed = line.trim();
  return usableFootSupport(trimmed) ? trimmed : houseFootSupport;
}

export async function publicFootSupport() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footsupport" },
  });
  return { line: readFootSupport(setting?.value) };
}

export async function staffFootSupport(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootSupport();
}

const footSupportSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFootSupport(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footSupportSchema.parse(req.body);
  if (!usableFootSupport(input.line))
    throw new HttpError(400, "Write the Footer customer support heading.");
  const current = await publicFootSupport();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footsupport" },
    update: { value: { line: input.line } },
    create: { key: "footsupport", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footsupport.line",
      entityType: "StoreSetting",
      entityId: "footsupport",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFootBoutique = "The boutique";

function usableFootBoutique(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFootBoutique(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFootBoutique;
  const line = value.line;
  if (typeof line !== "string") return houseFootBoutique;
  const trimmed = line.trim();
  return usableFootBoutique(trimmed) ? trimmed : houseFootBoutique;
}

export async function publicFootBoutique() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "footboutique" },
  });
  return { line: readFootBoutique(setting?.value) };
}

export async function staffFootBoutique(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFootBoutique();
}

const footBoutiqueSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFootBoutique(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = footBoutiqueSchema.parse(req.body);
  if (!usableFootBoutique(input.line))
    throw new HttpError(400, "Write the Footer boutique heading.");
  const current = await publicFootBoutique();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "footboutique" },
    update: { value: { line: input.line } },
    create: { key: "footboutique", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "footboutique.line",
      entityType: "StoreSetting",
      entityId: "footboutique",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const reasonIndexHouse = {
  reasonidx1: "01",
  reasonidx2: "02",
  reasonidx3: "03",
} as const;

type ReasonIndexKey = keyof typeof reasonIndexHouse;

function usableReasonIndex(line: string) {
  return (
    line.length >= 1 &&
    line.length <= 6 &&
    /^[A-Za-z0-9][A-Za-z0-9 .-]*$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readReasonIndex(key: ReasonIndexKey, value: unknown) {
  const house = reasonIndexHouse[key];
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return house;
  const line = value.line;
  if (typeof line !== "string") return house;
  const trimmed = line.trim();
  return usableReasonIndex(trimmed) ? trimmed : house;
}

export async function publicReasonIndex(key: ReasonIndexKey) {
  const setting = await prisma.storeSetting.findUnique({
    where: { key },
  });
  return { line: readReasonIndex(key, setting?.value) };
}

export async function staffReasonIndex(
  req: Request,
  res: Response,
  key: ReasonIndexKey,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicReasonIndex(key);
}

const reasonIndexSchema = z.object({
  line: z.string().trim().min(1).max(6),
});

export async function updateStaffReasonIndex(
  req: Request,
  res: Response,
  key: ReasonIndexKey,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = reasonIndexSchema.parse(req.body);
  if (!usableReasonIndex(input.line))
    throw new HttpError(
      400,
      `Write the Why reason ${reasonIndexHouse[key]} number.`,
    );
  const current = await publicReasonIndex(key);
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key },
    update: { value: { line: input.line } },
    create: { key, value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: `${key}.line`,
      entityType: "StoreSetting",
      entityId: key,
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseContactEyebrow = "The boutique";

function usableContactEyebrow(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readContactEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseContactEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseContactEyebrow;
  const trimmed = line.trim();
  return usableContactEyebrow(trimmed) ? trimmed : houseContactEyebrow;
}

export async function publicContactEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "contacteyebrow" },
  });
  return { line: readContactEyebrow(setting?.value) };
}

export async function staffContactEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicContactEyebrow();
}

const contactEyebrowSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffContactEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = contactEyebrowSchema.parse(req.body);
  if (!usableContactEyebrow(input.line))
    throw new HttpError(400, "Write the Contact page eyebrow.");
  const current = await publicContactEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "contacteyebrow" },
    update: { value: { line: input.line } },
    create: { key: "contacteyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "contacteyebrow.line",
      entityType: "StoreSetting",
      entityId: "contacteyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseShopEyebrow = "The edit";

function usableShopEyebrow(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readShopEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseShopEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseShopEyebrow;
  const trimmed = line.trim();
  return usableShopEyebrow(trimmed) ? trimmed : houseShopEyebrow;
}

export async function publicShopEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "shopeyebrow" },
  });
  return { line: readShopEyebrow(setting?.value) };
}

export async function staffShopEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicShopEyebrow();
}

const shopEyebrowSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffShopEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = shopEyebrowSchema.parse(req.body);
  if (!usableShopEyebrow(input.line))
    throw new HttpError(400, "Write the shop page eyebrow.");
  const current = await publicShopEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "shopeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "shopeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "shopeyebrow.line",
      entityType: "StoreSetting",
      entityId: "shopeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAppointmentEyebrow = "Appointment";

function usableAppointmentEyebrow(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readAppointmentEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAppointmentEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseAppointmentEyebrow;
  const trimmed = line.trim();
  return usableAppointmentEyebrow(trimmed) ? trimmed : houseAppointmentEyebrow;
}

export async function publicAppointmentEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "appointmenteyebrow" },
  });
  return { line: readAppointmentEyebrow(setting?.value) };
}

export async function staffAppointmentEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAppointmentEyebrow();
}

const appointmentEyebrowSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffAppointmentEyebrow(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = appointmentEyebrowSchema.parse(req.body);
  if (!usableAppointmentEyebrow(input.line))
    throw new HttpError(400, "Write the Appointment eyebrow.");
  const current = await publicAppointmentEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "appointmenteyebrow" },
    update: { value: { line: input.line } },
    create: { key: "appointmenteyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "appointmenteyebrow.line",
      entityType: "StoreSetting",
      entityId: "appointmenteyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseBespokeEyebrow = "Atelier";

function usableBespokeEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readBespokeEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseBespokeEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseBespokeEyebrow;
  const trimmed = line.trim();
  return usableBespokeEyebrow(trimmed) ? trimmed : houseBespokeEyebrow;
}

export async function publicBespokeEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "bespokeeyebrow" },
  });
  return { line: readBespokeEyebrow(setting?.value) };
}

export async function staffBespokeEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicBespokeEyebrow();
}

const bespokeEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffBespokeEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = bespokeEyebrowSchema.parse(req.body);
  if (!usableBespokeEyebrow(input.line))
    throw new HttpError(400, "Write the Bespoke page eyebrow.");
  const current = await publicBespokeEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "bespokeeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "bespokeeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "bespokeeyebrow.line",
      entityType: "StoreSetting",
      entityId: "bespokeeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const housePolicyEyebrow = "The house";

function usablePolicyEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readPolicyEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return housePolicyEyebrow;
  const line = value.line;
  if (typeof line !== "string") return housePolicyEyebrow;
  const trimmed = line.trim();
  return usablePolicyEyebrow(trimmed) ? trimmed : housePolicyEyebrow;
}

export async function publicPolicyEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "policyeyebrow" },
  });
  return { line: readPolicyEyebrow(setting?.value) };
}

export async function staffPolicyEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicPolicyEyebrow();
}

const policyEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffPolicyEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = policyEyebrowSchema.parse(req.body);
  if (!usablePolicyEyebrow(input.line))
    throw new HttpError(400, "Write the policy page eyebrow.");
  const current = await publicPolicyEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "policyeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "policyeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "policyeyebrow.line",
      entityType: "StoreSetting",
      entityId: "policyeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFaqEyebrow = "Questions";

function usableFaqEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFaqEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFaqEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseFaqEyebrow;
  const trimmed = line.trim();
  return usableFaqEyebrow(trimmed) ? trimmed : houseFaqEyebrow;
}

export async function publicFaqEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "faqeyebrow" },
  });
  return { line: readFaqEyebrow(setting?.value) };
}

export async function staffFaqEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFaqEyebrow();
}

const faqEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffFaqEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = faqEyebrowSchema.parse(req.body);
  if (!usableFaqEyebrow(input.line))
    throw new HttpError(400, "Write the FAQ eyebrow.");
  const current = await publicFaqEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "faqeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "faqeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "faqeyebrow.line",
      entityType: "StoreSetting",
      entityId: "faqeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSizeGuideEyebrow = "Fit";

function usableSizeGuideEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSizeGuideEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSizeGuideEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseSizeGuideEyebrow;
  const trimmed = line.trim();
  return usableSizeGuideEyebrow(trimmed) ? trimmed : houseSizeGuideEyebrow;
}

export async function publicSizeGuideEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "sizeguideeyebrow" },
  });
  return { line: readSizeGuideEyebrow(setting?.value) };
}

export async function staffSizeGuideEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSizeGuideEyebrow();
}

const sizeGuideEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSizeGuideEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = sizeGuideEyebrowSchema.parse(req.body);
  if (!usableSizeGuideEyebrow(input.line))
    throw new HttpError(400, "Write the size guide eyebrow.");
  const current = await publicSizeGuideEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "sizeguideeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "sizeguideeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "sizeguideeyebrow.line",
      entityType: "StoreSetting",
      entityId: "sizeguideeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseTrackEyebrow = "Orders";

function usableTrackEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readTrackEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseTrackEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseTrackEyebrow;
  const trimmed = line.trim();
  return usableTrackEyebrow(trimmed) ? trimmed : houseTrackEyebrow;
}

export async function publicTrackEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "trackeyebrow" },
  });
  return { line: readTrackEyebrow(setting?.value) };
}

export async function staffTrackEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicTrackEyebrow();
}

const trackEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffTrackEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = trackEyebrowSchema.parse(req.body);
  if (!usableTrackEyebrow(input.line))
    throw new HttpError(400, "Write the track page eyebrow.");
  const current = await publicTrackEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "trackeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "trackeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "trackeyebrow.line",
      entityType: "StoreSetting",
      entityId: "trackeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseNotFoundEyebrow = "404";

function usableNotFoundEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z0-9][A-Za-z0-9, .'-]*[A-Za-z0-9]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readNotFoundEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseNotFoundEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseNotFoundEyebrow;
  const trimmed = line.trim();
  return usableNotFoundEyebrow(trimmed) ? trimmed : houseNotFoundEyebrow;
}

export async function publicNotFoundEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "notfoundeyebrow" },
  });
  return { line: readNotFoundEyebrow(setting?.value) };
}

export async function staffNotFoundEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicNotFoundEyebrow();
}

const notFoundEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffNotFoundEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = notFoundEyebrowSchema.parse(req.body);
  if (!usableNotFoundEyebrow(input.line))
    throw new HttpError(400, "Write the 404 page eyebrow.");
  const current = await publicNotFoundEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "notfoundeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "notfoundeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "notfoundeyebrow.line",
      entityType: "StoreSetting",
      entityId: "notfoundeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseMaintenanceEyebrow = "PERIS";

function usableMaintenanceEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readMaintenanceEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseMaintenanceEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseMaintenanceEyebrow;
  const trimmed = line.trim();
  return usableMaintenanceEyebrow(trimmed) ? trimmed : houseMaintenanceEyebrow;
}

export async function publicMaintenanceEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "maintenanceeyebrow" },
  });
  return { line: readMaintenanceEyebrow(setting?.value) };
}

export async function staffMaintenanceEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicMaintenanceEyebrow();
}

const maintenanceEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffMaintenanceEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = maintenanceEyebrowSchema.parse(req.body);
  if (!usableMaintenanceEyebrow(input.line))
    throw new HttpError(400, "Write the maintenance page eyebrow.");
  const current = await publicMaintenanceEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "maintenanceeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "maintenanceeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "maintenanceeyebrow.line",
      entityType: "StoreSetting",
      entityId: "maintenanceeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSkuLabel = "SKU";

function usableSkuLabel(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSkuLabel(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSkuLabel;
  const line = value.line;
  if (typeof line !== "string") return houseSkuLabel;
  const trimmed = line.trim();
  return usableSkuLabel(trimmed) ? trimmed : houseSkuLabel;
}

export async function publicSkuLabel() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "skulabel" },
  });
  return { line: readSkuLabel(setting?.value) };
}

export async function staffSkuLabel(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSkuLabel();
}

const skuLabelSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSkuLabel(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = skuLabelSchema.parse(req.body);
  if (!usableSkuLabel(input.line))
    throw new HttpError(400, "Write the SKU label.");
  const current = await publicSkuLabel();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "skulabel" },
    update: { value: { line: input.line } },
    create: { key: "skulabel", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "skulabel.line",
      entityType: "StoreSetting",
      entityId: "skulabel",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCheckoutEyebrow = "Checkout";

function usableCheckoutEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readCheckoutEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCheckoutEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseCheckoutEyebrow;
  const trimmed = line.trim();
  return usableCheckoutEyebrow(trimmed) ? trimmed : houseCheckoutEyebrow;
}

export async function publicCheckoutEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "checkouteyebrow" },
  });
  return { line: readCheckoutEyebrow(setting?.value) };
}

export async function staffCheckoutEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCheckoutEyebrow();
}

const checkoutEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffCheckoutEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = checkoutEyebrowSchema.parse(req.body);
  if (!usableCheckoutEyebrow(input.line))
    throw new HttpError(400, "Write the checkout eyebrow.");
  const current = await publicCheckoutEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "checkouteyebrow" },
    update: { value: { line: input.line } },
    create: { key: "checkouteyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "checkouteyebrow.line",
      entityType: "StoreSetting",
      entityId: "checkouteyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseConfirmationEyebrow = "Order";

function usableConfirmationEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readConfirmationEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseConfirmationEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseConfirmationEyebrow;
  const trimmed = line.trim();
  return usableConfirmationEyebrow(trimmed)
    ? trimmed
    : houseConfirmationEyebrow;
}

export async function publicConfirmationEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "confirmationeyebrow" },
  });
  return { line: readConfirmationEyebrow(setting?.value) };
}

export async function staffConfirmationEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicConfirmationEyebrow();
}

const confirmationEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffConfirmationEyebrow(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = confirmationEyebrowSchema.parse(req.body);
  if (!usableConfirmationEyebrow(input.line))
    throw new HttpError(400, "Write the confirmation eyebrow.");
  const current = await publicConfirmationEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "confirmationeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "confirmationeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "confirmationeyebrow.line",
      entityType: "StoreSetting",
      entityId: "confirmationeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseBagEyebrow = "Bag";

function usableBagEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readBagEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseBagEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseBagEyebrow;
  const trimmed = line.trim();
  return usableBagEyebrow(trimmed) ? trimmed : houseBagEyebrow;
}

export async function publicBagEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "bageyebrow" },
  });
  return { line: readBagEyebrow(setting?.value) };
}

export async function staffBagEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicBagEyebrow();
}

const bagEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffBagEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = bagEyebrowSchema.parse(req.body);
  if (!usableBagEyebrow(input.line))
    throw new HttpError(400, "Write the bag eyebrow.");
  const current = await publicBagEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "bageyebrow" },
    update: { value: { line: input.line } },
    create: { key: "bageyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "bageyebrow.line",
      entityType: "StoreSetting",
      entityId: "bageyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSummaryEyebrow = "Summary";

function usableSummaryEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSummaryEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSummaryEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseSummaryEyebrow;
  const trimmed = line.trim();
  return usableSummaryEyebrow(trimmed) ? trimmed : houseSummaryEyebrow;
}

export async function publicSummaryEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "summaryeyebrow" },
  });
  return { line: readSummaryEyebrow(setting?.value) };
}

export async function staffSummaryEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSummaryEyebrow();
}

const summaryEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSummaryEyebrow(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = summaryEyebrowSchema.parse(req.body);
  if (!usableSummaryEyebrow(input.line))
    throw new HttpError(400, "Write the summary eyebrow.");
  const current = await publicSummaryEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "summaryeyebrow" },
    update: { value: { line: input.line } },
    create: { key: "summaryeyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "summaryeyebrow.line",
      entityType: "StoreSetting",
      entityId: "summaryeyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const housePolicyBanner =
  "Pending approval from the business owner. This is not a final policy.";

function usablePolicyBanner(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readPolicyBanner(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return housePolicyBanner;
  const line = value.line;
  if (typeof line !== "string") return housePolicyBanner;
  const trimmed = line.trim();
  return usablePolicyBanner(trimmed) ? trimmed : housePolicyBanner;
}

export async function publicPolicyBanner() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "policybanner" },
  });
  return { line: readPolicyBanner(setting?.value) };
}

export async function staffPolicyBanner(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicPolicyBanner();
}

const policyBannerSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffPolicyBanner(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = policyBannerSchema.parse(req.body);
  if (!usablePolicyBanner(input.line))
    throw new HttpError(400, "Write the policy draft banner.");
  const current = await publicPolicyBanner();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "policybanner" },
    update: { value: { line: input.line } },
    create: { key: "policybanner", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "policybanner.line",
      entityType: "StoreSetting",
      entityId: "policybanner",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAccountEyebrow = "Account";

function usableAccountEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readAccountEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAccountEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseAccountEyebrow;
  const trimmed = line.trim();
  return usableAccountEyebrow(trimmed) ? trimmed : houseAccountEyebrow;
}

export async function publicAccountEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "accounteyebrow" },
  });
  return { line: readAccountEyebrow(setting?.value) };
}

export async function staffAccountEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAccountEyebrow();
}

const accountEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffAccountEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = accountEyebrowSchema.parse(req.body);
  if (!usableAccountEyebrow(input.line))
    throw new HttpError(400, "Write the account eyebrow.");
  const current = await publicAccountEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "accounteyebrow" },
    update: { value: { line: input.line } },
    create: { key: "accounteyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "accounteyebrow.line",
      entityType: "StoreSetting",
      entityId: "accounteyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseWishlistEyebrow = "Wishlist";

function usableWishlistEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readWishlistEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseWishlistEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseWishlistEyebrow;
  const trimmed = line.trim();
  return usableWishlistEyebrow(trimmed) ? trimmed : houseWishlistEyebrow;
}

export async function publicWishlistEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "wishlisteyebrow" },
  });
  return { line: readWishlistEyebrow(setting?.value) };
}

export async function staffWishlistEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicWishlistEyebrow();
}

const wishlistEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffWishlistEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = wishlistEyebrowSchema.parse(req.body);
  if (!usableWishlistEyebrow(input.line))
    throw new HttpError(400, "Write the wishlist eyebrow.");
  const current = await publicWishlistEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "wishlisteyebrow" },
    update: { value: { line: input.line } },
    create: { key: "wishlisteyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "wishlisteyebrow.line",
      entityType: "StoreSetting",
      entityId: "wishlisteyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSearchEyebrow = "Search";

function usableSearchEyebrow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSearchEyebrow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSearchEyebrow;
  const line = value.line;
  if (typeof line !== "string") return houseSearchEyebrow;
  const trimmed = line.trim();
  return usableSearchEyebrow(trimmed) ? trimmed : houseSearchEyebrow;
}

export async function publicSearchEyebrow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "searcheyebrow" },
  });
  return { line: readSearchEyebrow(setting?.value) };
}

export async function staffSearchEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSearchEyebrow();
}

const searchEyebrowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSearchEyebrow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = searchEyebrowSchema.parse(req.body);
  if (!usableSearchEyebrow(input.line))
    throw new HttpError(400, "Write the search eyebrow.");
  const current = await publicSearchEyebrow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "searcheyebrow" },
    update: { value: { line: input.line } },
    create: { key: "searcheyebrow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "searcheyebrow.line",
      entityType: "StoreSetting",
      entityId: "searcheyebrow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseWhatsAppPrefill =
  "Hello PERIS, I would like to talk about an abaya.";

function usableWhatsAppPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readWhatsAppPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseWhatsAppPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseWhatsAppPrefill;
  const trimmed = line.trim();
  return usableWhatsAppPrefill(trimmed) ? trimmed : houseWhatsAppPrefill;
}

export async function publicWhatsAppPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "whatsappprefill" },
  });
  return { line: readWhatsAppPrefill(setting?.value) };
}

export async function staffWhatsAppPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicWhatsAppPrefill();
}

const whatsAppPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffWhatsAppPrefill(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = whatsAppPrefillSchema.parse(req.body);
  if (!usableWhatsAppPrefill(input.line))
    throw new HttpError(400, "Write the WhatsApp prefill.");
  const current = await publicWhatsAppPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "whatsappprefill" },
    update: { value: { line: input.line } },
    create: { key: "whatsappprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "whatsappprefill.line",
      entityType: "StoreSetting",
      entityId: "whatsappprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSizeGuideBanner =
  "Pending the master tailor's measurements. The ranges below are not a PERIS size chart yet.";

function usableSizeGuideBanner(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSizeGuideBanner(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSizeGuideBanner;
  const line = value.line;
  if (typeof line !== "string") return houseSizeGuideBanner;
  const trimmed = line.trim();
  return usableSizeGuideBanner(trimmed) ? trimmed : houseSizeGuideBanner;
}

export async function publicSizeGuideBanner() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "sizeguidebanner" },
  });
  return { line: readSizeGuideBanner(setting?.value) };
}

export async function staffSizeGuideBanner(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSizeGuideBanner();
}

const sizeGuideBannerSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffSizeGuideBanner(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = sizeGuideBannerSchema.parse(req.body);
  if (!usableSizeGuideBanner(input.line))
    throw new HttpError(400, "Write the size guide draft banner.");
  const current = await publicSizeGuideBanner();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "sizeguidebanner" },
    update: { value: { line: input.line } },
    create: { key: "sizeguidebanner", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "sizeguidebanner.line",
      entityType: "StoreSetting",
      entityId: "sizeguidebanner",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseHeroAlt =
  "Placeholder study of a black column abaya in front of a burgundy curtain";

function usableHeroAlt(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readHeroAlt(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseHeroAlt;
  const line = value.line;
  if (typeof line !== "string") return houseHeroAlt;
  const trimmed = line.trim();
  return usableHeroAlt(trimmed) ? trimmed : houseHeroAlt;
}

export async function publicHeroAlt() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "heroalt" },
  });
  return { line: readHeroAlt(setting?.value) };
}

export async function staffHeroAlt(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicHeroAlt();
}

const heroAltSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffHeroAlt(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = heroAltSchema.parse(req.body);
  if (!usableHeroAlt(input.line))
    throw new HttpError(400, "Write the homepage hero alt text.");
  const current = await publicHeroAlt();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "heroalt" },
    update: { value: { line: input.line } },
    create: { key: "heroalt", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "heroalt.line",
      entityType: "StoreSetting",
      entityId: "heroalt",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseStoryAlt =
  "Placeholder study of embroidery at the neckline of a black abaya";

function usableStoryAlt(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readStoryAlt(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseStoryAlt;
  const line = value.line;
  if (typeof line !== "string") return houseStoryAlt;
  const trimmed = line.trim();
  return usableStoryAlt(trimmed) ? trimmed : houseStoryAlt;
}

export async function publicStoryAlt() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "storyalt" },
  });
  return { line: readStoryAlt(setting?.value) };
}

export async function staffStoryAlt(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicStoryAlt();
}

const storyAltSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffStoryAlt(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = storyAltSchema.parse(req.body);
  if (!usableStoryAlt(input.line))
    throw new HttpError(400, "Write the homepage story alt text.");
  const current = await publicStoryAlt();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "storyalt" },
    update: { value: { line: input.line } },
    create: { key: "storyalt", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "storyalt.line",
      entityType: "StoreSetting",
      entityId: "storyalt",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAboutAlt = "Placeholder study of a black column abaya";

function usableAboutAlt(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readAboutAlt(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAboutAlt;
  const line = value.line;
  if (typeof line !== "string") return houseAboutAlt;
  const trimmed = line.trim();
  return usableAboutAlt(trimmed) ? trimmed : houseAboutAlt;
}

export async function publicAboutAlt() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "aboutalt" },
  });
  return { line: readAboutAlt(setting?.value) };
}

export async function staffAboutAlt(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAboutAlt();
}

const aboutAltSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffAboutAlt(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = aboutAltSchema.parse(req.body);
  if (!usableAboutAlt(input.line))
    throw new HttpError(400, "Write the about page alt text.");
  const current = await publicAboutAlt();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "aboutalt" },
    update: { value: { line: input.line } },
    create: { key: "aboutalt", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "aboutalt.line",
      entityType: "StoreSetting",
      entityId: "aboutalt",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAppointmentPrefill =
  "Hello PERIS, I would like to book an appointment.";

function usableAppointmentPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readAppointmentPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAppointmentPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseAppointmentPrefill;
  const trimmed = line.trim();
  return usableAppointmentPrefill(trimmed) ? trimmed : houseAppointmentPrefill;
}

export async function publicAppointmentPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "appointmentprefill" },
  });
  return { line: readAppointmentPrefill(setting?.value) };
}

export async function staffAppointmentPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAppointmentPrefill();
}

const appointmentPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffAppointmentPrefill(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = appointmentPrefillSchema.parse(req.body);
  if (!usableAppointmentPrefill(input.line))
    throw new HttpError(400, "Write the appointment WhatsApp prefill.");
  const current = await publicAppointmentPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "appointmentprefill" },
    update: { value: { line: input.line } },
    create: { key: "appointmentprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "appointmentprefill.line",
      entityType: "StoreSetting",
      entityId: "appointmentprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSearchIcon = "Search";

function usableSearchIcon(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSearchIcon(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSearchIcon;
  const line = value.line;
  if (typeof line !== "string") return houseSearchIcon;
  const trimmed = line.trim();
  return usableSearchIcon(trimmed) ? trimmed : houseSearchIcon;
}

export async function publicSearchIcon() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "searchicon" },
  });
  return { line: readSearchIcon(setting?.value) };
}

export async function staffSearchIcon(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSearchIcon();
}

const searchIconSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSearchIcon(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = searchIconSchema.parse(req.body);
  if (!usableSearchIcon(input.line))
    throw new HttpError(400, "Write the header Search icon label.");
  const current = await publicSearchIcon();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "searchicon" },
    update: { value: { line: input.line } },
    create: { key: "searchicon", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "searchicon.line",
      entityType: "StoreSetting",
      entityId: "searchicon",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSearchHouse = "Search the house";

function usableSearchHouse(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSearchHouse(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSearchHouse;
  const line = value.line;
  if (typeof line !== "string") return houseSearchHouse;
  const trimmed = line.trim();
  return usableSearchHouse(trimmed) ? trimmed : houseSearchHouse;
}

export async function publicSearchHouse() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "searchhouse" },
  });
  return { line: readSearchHouse(setting?.value) };
}

export async function staffSearchHouse(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSearchHouse();
}

const searchHouseSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSearchHouse(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = searchHouseSchema.parse(req.body);
  if (!usableSearchHouse(input.line))
    throw new HttpError(400, "Write the Search the house label.");
  const current = await publicSearchHouse();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "searchhouse" },
    update: { value: { line: input.line } },
    create: { key: "searchhouse", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "searchhouse.line",
      entityType: "StoreSetting",
      entityId: "searchhouse",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSearchPieces = "Search pieces";

function usableSearchPieces(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSearchPieces(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSearchPieces;
  const line = value.line;
  if (typeof line !== "string") return houseSearchPieces;
  const trimmed = line.trim();
  return usableSearchPieces(trimmed) ? trimmed : houseSearchPieces;
}

export async function publicSearchPieces() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "searchpieces" },
  });
  return { line: readSearchPieces(setting?.value) };
}

export async function staffSearchPieces(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSearchPieces();
}

const searchPiecesSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSearchPieces(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = searchPiecesSchema.parse(req.body);
  if (!usableSearchPieces(input.line))
    throw new HttpError(400, "Write the Search pieces placeholder.");
  const current = await publicSearchPieces();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "searchpieces" },
    update: { value: { line: input.line } },
    create: { key: "searchpieces", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "searchpieces.line",
      entityType: "StoreSetting",
      entityId: "searchpieces",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSearchSubmit = "Search";

function usableSearchSubmit(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSearchSubmit(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSearchSubmit;
  const line = value.line;
  if (typeof line !== "string") return houseSearchSubmit;
  const trimmed = line.trim();
  return usableSearchSubmit(trimmed) ? trimmed : houseSearchSubmit;
}

export async function publicSearchSubmit() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "searchsubmit" },
  });
  return { line: readSearchSubmit(setting?.value) };
}

export async function staffSearchSubmit(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSearchSubmit();
}

const searchSubmitSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSearchSubmit(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = searchSubmitSchema.parse(req.body);
  if (!usableSearchSubmit(input.line))
    throw new HttpError(400, "Write the Search submit button text.");
  const current = await publicSearchSubmit();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "searchsubmit" },
    update: { value: { line: input.line } },
    create: { key: "searchsubmit", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "searchsubmit.line",
      entityType: "StoreSetting",
      entityId: "searchsubmit",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseOrderNow = "Order Now";

function usableOrderNow(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readOrderNow(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseOrderNow;
  const line = value.line;
  if (typeof line !== "string") return houseOrderNow;
  const trimmed = line.trim();
  return usableOrderNow(trimmed) ? trimmed : houseOrderNow;
}

export async function publicOrderNow() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "ordernow" },
  });
  return { line: readOrderNow(setting?.value) };
}

export async function staffOrderNow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicOrderNow();
}

const orderNowSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffOrderNow(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = orderNowSchema.parse(req.body);
  if (!usableOrderNow(input.line))
    throw new HttpError(400, "Write the Order Now label.");
  const current = await publicOrderNow();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "ordernow" },
    update: { value: { line: input.line } },
    create: { key: "ordernow", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "ordernow.line",
      entityType: "StoreSetting",
      entityId: "ordernow",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseOrderPrefill =
  "Hello PERIS, I would like to place an order.";

function usableOrderPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readOrderPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseOrderPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseOrderPrefill;
  const trimmed = line.trim();
  return usableOrderPrefill(trimmed) ? trimmed : houseOrderPrefill;
}

export async function publicOrderPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "orderprefill" },
  });
  return { line: readOrderPrefill(setting?.value) };
}

export async function staffOrderPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicOrderPrefill();
}

const orderPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffOrderPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = orderPrefillSchema.parse(req.body);
  if (!usableOrderPrefill(input.line))
    throw new HttpError(400, "Write the Order WhatsApp prefill.");
  const current = await publicOrderPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "orderprefill" },
    update: { value: { line: input.line } },
    create: { key: "orderprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "orderprefill.line",
      entityType: "StoreSetting",
      entityId: "orderprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseBespokePrefill =
  "Hello PERIS, I would like to enquire about bespoke tailoring.";

function usableBespokePrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readBespokePrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseBespokePrefill;
  const line = value.line;
  if (typeof line !== "string") return houseBespokePrefill;
  const trimmed = line.trim();
  return usableBespokePrefill(trimmed) ? trimmed : houseBespokePrefill;
}

export async function publicBespokePrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "bespokeprefill" },
  });
  return { line: readBespokePrefill(setting?.value) };
}

export async function staffBespokePrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicBespokePrefill();
}

const bespokePrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffBespokePrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = bespokePrefillSchema.parse(req.body);
  if (!usableBespokePrefill(input.line))
    throw new HttpError(400, "Write the Bespoke WhatsApp prefill.");
  const current = await publicBespokePrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "bespokeprefill" },
    update: { value: { line: input.line } },
    create: { key: "bespokeprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "bespokeprefill.line",
      entityType: "StoreSetting",
      entityId: "bespokeprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseOrderHelpPrefill =
  "Hello PERIS, I need help with an order.";

function usableOrderHelpPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readOrderHelpPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseOrderHelpPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseOrderHelpPrefill;
  const trimmed = line.trim();
  return usableOrderHelpPrefill(trimmed) ? trimmed : houseOrderHelpPrefill;
}

export async function publicOrderHelpPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "orderhelpprefill" },
  });
  return { line: readOrderHelpPrefill(setting?.value) };
}

export async function staffOrderHelpPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicOrderHelpPrefill();
}

const orderHelpPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffOrderHelpPrefill(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = orderHelpPrefillSchema.parse(req.body);
  if (!usableOrderHelpPrefill(input.line))
    throw new HttpError(400, "Write the Order help WhatsApp prefill.");
  const current = await publicOrderHelpPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "orderhelpprefill" },
    update: { value: { line: input.line } },
    create: { key: "orderhelpprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "orderhelpprefill.line",
      entityType: "StoreSetting",
      entityId: "orderhelpprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseProductPrefill =
  "Hello PERIS, I would like to ask about";

function usableProductPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readProductPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseProductPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseProductPrefill;
  const trimmed = line.trim();
  return usableProductPrefill(trimmed) ? trimmed : houseProductPrefill;
}

export async function publicProductPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "productprefill" },
  });
  return { line: readProductPrefill(setting?.value) };
}

export async function staffProductPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicProductPrefill();
}

const productPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffProductPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = productPrefillSchema.parse(req.body);
  if (!usableProductPrefill(input.line))
    throw new HttpError(400, "Write the Product WhatsApp prefill.");
  const current = await publicProductPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "productprefill" },
    update: { value: { line: input.line } },
    create: { key: "productprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "productprefill.line",
      entityType: "StoreSetting",
      entityId: "productprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseCheckoutPrefill = "Hello PERIS, my order is";

function usableCheckoutPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readCheckoutPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseCheckoutPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseCheckoutPrefill;
  const trimmed = line.trim();
  return usableCheckoutPrefill(trimmed) ? trimmed : houseCheckoutPrefill;
}

export async function publicCheckoutPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "checkoutprefill" },
  });
  return { line: readCheckoutPrefill(setting?.value) };
}

export async function staffCheckoutPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicCheckoutPrefill();
}

const checkoutPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffCheckoutPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = checkoutPrefillSchema.parse(req.body);
  if (!usableCheckoutPrefill(input.line))
    throw new HttpError(400, "Write the Checkout WhatsApp prefill.");
  const current = await publicCheckoutPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "checkoutprefill" },
    update: { value: { line: input.line } },
    create: { key: "checkoutprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "checkoutprefill.line",
      entityType: "StoreSetting",
      entityId: "checkoutprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseBespokeSendPrefill = "Bespoke request";

function usableBespokeSendPrefill(line: string) {
  return (
    line.length >= 10 &&
    line.length <= 200 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readBespokeSendPrefill(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseBespokeSendPrefill;
  const line = value.line;
  if (typeof line !== "string") return houseBespokeSendPrefill;
  const trimmed = line.trim();
  return usableBespokeSendPrefill(trimmed)
    ? trimmed
    : houseBespokeSendPrefill;
}

export async function publicBespokeSendPrefill() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "bespokesendprefill" },
  });
  return { line: readBespokeSendPrefill(setting?.value) };
}

export async function staffBespokeSendPrefill(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicBespokeSendPrefill();
}

const bespokeSendPrefillSchema = z.object({
  line: z.string().trim().min(10).max(200),
});

export async function updateStaffBespokeSendPrefill(
  req: Request,
  res: Response,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = bespokeSendPrefillSchema.parse(req.body);
  if (!usableBespokeSendPrefill(input.line))
    throw new HttpError(400, "Write the Bespoke send WhatsApp prefill.");
  const current = await publicBespokeSendPrefill();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "bespokesendprefill" },
    update: { value: { line: input.line } },
    create: { key: "bespokesendprefill", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "bespokesendprefill.line",
      entityType: "StoreSetting",
      entityId: "bespokesendprefill",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseSendWhatsApp = "Send on WhatsApp";

function usableSendWhatsApp(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readSendWhatsApp(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseSendWhatsApp;
  const line = value.line;
  if (typeof line !== "string") return houseSendWhatsApp;
  const trimmed = line.trim();
  return usableSendWhatsApp(trimmed) ? trimmed : houseSendWhatsApp;
}

export async function publicSendWhatsApp() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "sendwhatsapp" },
  });
  return { line: readSendWhatsApp(setting?.value) };
}

export async function staffSendWhatsApp(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicSendWhatsApp();
}

const sendWhatsAppSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffSendWhatsApp(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = sendWhatsAppSchema.parse(req.body);
  if (!usableSendWhatsApp(input.line))
    throw new HttpError(400, "Write the Send on WhatsApp label.");
  const current = await publicSendWhatsApp();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "sendwhatsapp" },
    update: { value: { line: input.line } },
    create: { key: "sendwhatsapp", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "sendwhatsapp.line",
      entityType: "StoreSetting",
      entityId: "sendwhatsapp",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseAskPiece = "Ask about this piece on WhatsApp";

function usableAskPiece(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readAskPiece(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseAskPiece;
  const line = value.line;
  if (typeof line !== "string") return houseAskPiece;
  const trimmed = line.trim();
  return usableAskPiece(trimmed) ? trimmed : houseAskPiece;
}

export async function publicAskPiece() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "askpiece" },
  });
  return { line: readAskPiece(setting?.value) };
}

export async function staffAskPiece(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicAskPiece();
}

const askPieceSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffAskPiece(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = askPieceSchema.parse(req.body);
  if (!usableAskPiece(input.line))
    throw new HttpError(400, "Write the Ask about this piece on WhatsApp label.");
  const current = await publicAskPiece();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "askpiece" },
    update: { value: { line: input.line } },
    create: { key: "askpiece", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "askpiece.line",
      entityType: "StoreSetting",
      entityId: "askpiece",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseTellBoutique = "Tell the boutique on WhatsApp";

function usableTellBoutique(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readTellBoutique(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseTellBoutique;
  const line = value.line;
  if (typeof line !== "string") return houseTellBoutique;
  const trimmed = line.trim();
  return usableTellBoutique(trimmed) ? trimmed : houseTellBoutique;
}

export async function publicTellBoutique() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "tellboutique" },
  });
  return { line: readTellBoutique(setting?.value) };
}

export async function staffTellBoutique(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicTellBoutique();
}

const tellBoutiqueSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffTellBoutique(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = tellBoutiqueSchema.parse(req.body);
  if (!usableTellBoutique(input.line))
    throw new HttpError(400, "Write the Tell the boutique on WhatsApp label.");
  const current = await publicTellBoutique();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "tellboutique" },
    update: { value: { line: input.line } },
    create: { key: "tellboutique", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "tellboutique.line",
      entityType: "StoreSetting",
      entityId: "tellboutique",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseWaBoutique = "WhatsApp the boutique";

function usableWaBoutique(line: string) {
  return (
    line.length >= 2 &&
    line.length <= 40 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readWaBoutique(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseWaBoutique;
  const line = value.line;
  if (typeof line !== "string") return houseWaBoutique;
  const trimmed = line.trim();
  return usableWaBoutique(trimmed) ? trimmed : houseWaBoutique;
}

export async function publicWaBoutique() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "waboutique" },
  });
  return { line: readWaBoutique(setting?.value) };
}

export async function staffWaBoutique(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicWaBoutique();
}

const waBoutiqueSchema = z.object({
  line: z.string().trim().min(2).max(40),
});

export async function updateStaffWaBoutique(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = waBoutiqueSchema.parse(req.body);
  if (!usableWaBoutique(input.line))
    throw new HttpError(400, "Write the WhatsApp the boutique label.");
  const current = await publicWaBoutique();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "waboutique" },
    update: { value: { line: input.line } },
    create: { key: "waboutique", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "waboutique.line",
      entityType: "StoreSetting",
      entityId: "waboutique",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseChatCta = "Chat with Us on WhatsApp";

function usableChatCta(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readChatCta(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseChatCta;
  const line = value.line;
  if (typeof line !== "string") return houseChatCta;
  const trimmed = line.trim();
  return usableChatCta(trimmed) ? trimmed : houseChatCta;
}

export async function publicChatCta() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "chatcta" },
  });
  return { line: readChatCta(setting?.value) };
}

export async function staffChatCta(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicChatCta();
}

const chatCtaSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffChatCta(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = chatCtaSchema.parse(req.body);
  if (!usableChatCta(input.line))
    throw new HttpError(400, "Write the Chat with Us on WhatsApp button text.");
  const current = await publicChatCta();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "chatcta" },
    update: { value: { line: input.line } },
    create: { key: "chatcta", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "chatcta.line",
      entityType: "StoreSetting",
      entityId: "chatcta",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseExploreCta = "Explore Our Collections";

function usableExploreCta(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readExploreCta(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseExploreCta;
  const line = value.line;
  if (typeof line !== "string") return houseExploreCta;
  const trimmed = line.trim();
  return usableExploreCta(trimmed) ? trimmed : houseExploreCta;
}

export async function publicExploreCta() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "explorecta" },
  });
  return { line: readExploreCta(setting?.value) };
}

export async function staffExploreCta(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicExploreCta();
}

const exploreCtaSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffExploreCta(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = exploreCtaSchema.parse(req.body);
  if (!usableExploreCta(input.line))
    throw new HttpError(400, "Write the Explore Our Collections button text.");
  const current = await publicExploreCta();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "explorecta" },
    update: { value: { line: input.line } },
    create: { key: "explorecta", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "explorecta.line",
      entityType: "StoreSetting",
      entityId: "explorecta",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseFittingRoom = "From the fitting room";

function usableFittingRoom(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readFittingRoom(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseFittingRoom;
  const line = value.line;
  if (typeof line !== "string") return houseFittingRoom;
  const trimmed = line.trim();
  return usableFittingRoom(trimmed) ? trimmed : houseFittingRoom;
}

export async function publicFittingRoom() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "fittingroom" },
  });
  return { line: readFittingRoom(setting?.value) };
}

export async function staffFittingRoom(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicFittingRoom();
}

const fittingRoomSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffFittingRoom(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = fittingRoomSchema.parse(req.body);
  if (!usableFittingRoom(input.line))
    throw new HttpError(400, "Write the fitting room heading.");
  const current = await publicFittingRoom();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "fittingroom" },
    update: { value: { line: input.line } },
    create: { key: "fittingroom", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "fittingroom.line",
      entityType: "StoreSetting",
      entityId: "fittingroom",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

const houseInstagramLink = "Open Instagram";

function usableInstagramLink(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 80 &&
    /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) &&
    !/[\r\n]/.test(line)
  );
}

function readInstagramLink(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("line" in value)
  )
    return houseInstagramLink;
  const line = value.line;
  if (typeof line !== "string") return houseInstagramLink;
  const trimmed = line.trim();
  return usableInstagramLink(trimmed) ? trimmed : houseInstagramLink;
}

export async function publicInstagramLink() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: "instagramlink" },
  });
  return { line: readInstagramLink(setting?.value) };
}

export async function staffInstagramLink(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  return publicInstagramLink();
}

const instagramLinkSchema = z.object({
  line: z.string().trim().min(8).max(80),
});

export async function updateStaffInstagramLink(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = instagramLinkSchema.parse(req.body);
  if (!usableInstagramLink(input.line))
    throw new HttpError(400, "Write the Open Instagram link text.");
  const current = await publicInstagramLink();
  if (current.line === input.line) return current;
  await prisma.storeSetting.upsert({
    where: { key: "instagramlink" },
    update: { value: { line: input.line } },
    create: { key: "instagramlink", value: { line: input.line } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "instagramlink.line",
      entityType: "StoreSetting",
      entityId: "instagramlink",
      metadata: {},
      ip: req.ip,
    },
  });
  return { line: input.line };
}

export async function staffAnnouncements(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const rows = await prisma.announcement.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    isActive: row.isActive,
  }));
}

const announcementSchema = z.object({
  isActive: z.boolean(),
});

export async function updateStaffAnnouncement(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = announcementSchema.parse(req.body);
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That notice is not on the desk.");
  if (existing.isActive === input.isActive)
    return {
      id: existing.id,
      message: existing.message,
      isActive: existing.isActive,
    };
  const notice = await prisma.announcement.update({
    where: { id: existing.id },
    data: { isActive: input.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "announcement.publish",
      entityType: "Announcement",
      entityId: notice.id,
      metadata: { id: notice.id, toActive: notice.isActive },
      ip: req.ip,
    },
  });
  return { id: notice.id, message: notice.message, isActive: notice.isActive };
}

const announcementLineSchema = z.object({
  message: z.string().trim().min(8).max(160),
});

export async function updateStaffAnnouncementLine(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "content.write");
  if (!actor) return null;
  const input = announcementLineSchema.parse(req.body);
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "That notice is not on the desk.");
  if (existing.message === input.message)
    return {
      id: existing.id,
      message: existing.message,
      isActive: existing.isActive,
    };
  const notice = await prisma.announcement.update({
    where: { id: existing.id },
    data: { message: input.message },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "announcement.line",
      entityType: "Announcement",
      entityId: notice.id,
      metadata: { id: notice.id },
      ip: req.ip,
    },
  });
  return { id: notice.id, message: notice.message, isActive: notice.isActive };
}

export async function staffInventory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "inventory.write");
  if (!actor) return null;
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: true, color: true, size: true },
  });
  return variants
    .map(presentStock)
    .sort(
      (a, b) =>
        a.productName.localeCompare(b.productName) ||
        a.color.localeCompare(b.color) ||
        a.sizeOrder - b.sizeOrder,
    );
}

const movementLabel: Record<string, string> = {
  ADJUST: "Count changed",
  COMMIT: "Taken for an order",
  RETURN: "Returned to stock",
  RECEIVE: "Received",
  RESERVE: "Reserved",
  RELEASE: "Released",
};

export async function stockHistory(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "inventory.write");
  if (!actor) return null;
  const productId = z
    .string()
    .trim()
    .min(1)
    .max(40)
    .parse(String(req.query.productId ?? ""));
  const rows = await prisma.inventoryTransaction.findMany({
    where: { variant: { productId } },
    include: { variant: { include: { color: true, size: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map((row) => ({
    id: row.id,
    color: row.variant.color.name,
    size: row.variant.size.code,
    label: movementLabel[row.type] ?? row.type,
    delta: row.quantityDelta,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function adjustStock(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "inventory.write");
  if (!actor) return null;
  const input = stockAdjustSchema.parse(req.body);
  if (input.delta === 0)
    throw new HttpError(400, "Enter how many pieces to add or remove.");
  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: { product: true, color: true, size: true },
  });
  if (!variant || !variant.isActive)
    throw new HttpError(404, "That size is not on the desk.");
  const nextOnHand = variant.stockOnHand + input.delta;
  if (nextOnHand < variant.stockReserved) {
    const removable = variant.stockOnHand - variant.stockReserved;
    throw new HttpError(
      409,
      removable < 1
        ? "None of this size can be removed."
        : `Only ${removable} can be removed.`,
    );
  }
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.productVariant.update({
      where: { id: variant.id },
      data: { stockOnHand: nextOnHand },
      include: { product: true, color: true, size: true },
    });
    await tx.inventoryTransaction.create({
      data: {
        variantId: variant.id,
        type: "ADJUST",
        quantityDelta: input.delta,
        reason: input.reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "inventory.adjust",
        entityType: "ProductVariant",
        entityId: variant.id,
        metadata: {
          sku: variant.sku,
          delta: input.delta,
          available: row.stockOnHand - row.stockReserved,
          reason: input.reason,
        },
        ip: req.ip,
      },
    });
    return row;
  });
  return presentStock(updated);
}

const cancellable = new Set<OrderStatus>([
  "CONFIRMED",
  "PROCESSING",
  "TAILORING",
  "READY_FOR_SHIPMENT",
]);

export async function cancelOrder(req: Request, res: Response, number: string) {
  const actor = await requireStaff(req, res, "orders.write");
  if (!actor) return null;
  const order = await prisma.order.findUnique({
    where: { number: number.trim() },
    include: { items: true, payments: true },
  });
  if (!order) throw new HttpError(404, "That order is not on the desk.");
  if (order.paymentStatus === "PAID")
    throw new HttpError(
      409,
      "A collected order stays open until a refund is recorded.",
    );
  if (!cancellable.has(order.status))
    throw new HttpError(409, "This order can no longer be cancelled.");
  const payment = order.payments.find(
    (item) => item.method === "cod" && item.provider === "cod",
  );
  if (!payment || payment.status !== "UNPAID")
    throw new HttpError(
      409,
      "Only an unpaid cash order can be cancelled here.",
    );

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const variant = await tx.productVariant.findUnique({
        where: { sku: item.sku },
      });
      if (!variant)
        throw new HttpError(409, `${item.name} is no longer in the catalog.`);
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockOnHand: { increment: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          type: "RETURN",
          quantityDelta: item.quantity,
          reason: `Cancelled ${order.number}`,
        },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        note: "Cancelled by staff. The pieces were returned to stock.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "order.cancel",
        entityType: "Order",
        entityId: order.id,
        metadata: { number: order.number },
        ip: req.ip,
      },
    });
  });

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return presentStaffOrder(updated);
}

export async function refundOrder(req: Request, res: Response, number: string) {
  const actor = await requireStaff(req, res, "orders.refund");
  if (!actor) return null;
  const input = refundSchema.parse(req.body);
  const order = await prisma.order.findUnique({
    where: { number: number.trim() },
    include: { items: true, payments: true },
  });
  if (!order) throw new HttpError(404, "That order is not on the desk.");
  if (order.paymentStatus === "REFUNDED" || order.status === "REFUNDED") {
    throw new HttpError(409, "This refund is already recorded.");
  }
  const payment = order.payments.find(
    (item) => item.method === "cod" && item.provider === "cod",
  );
  if (!payment || payment.status !== "PAID" || order.paymentStatus !== "PAID") {
    throw new HttpError(
      409,
      "Only a collected cash order can be refunded here.",
    );
  }
  const restock = cancellable.has(order.status);

  await prisma.$transaction(async (tx) => {
    if (restock) {
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { sku: item.sku },
        });
        if (!variant)
          throw new HttpError(409, `${item.name} is no longer in the catalog.`);
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockOnHand: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            variantId: variant.id,
            type: "RETURN",
            quantityDelta: item.quantity,
            reason: `Refund ${order.number}`,
          },
        });
      }
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED", status: "REFUNDED" },
    });
    await tx.refund.create({
      data: {
        paymentId: payment.id,
        amountFils: payment.amountFils,
        status: "recorded",
        reason: input.reason,
      },
    });
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        provider: "cod",
        eventId: `cod-refund:${payment.id}`,
        payload: {
          recordedBy: actor.id,
          number: order.number,
          amountFils: payment.amountFils,
        },
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "REFUNDED",
        note: restock
          ? "Cash refund recorded by staff. The pieces were returned to stock."
          : "Cash refund recorded by staff. Pieces already handed over were left out of stock.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "payment.refund",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          number: order.number,
          amountFils: payment.amountFils,
          restock,
        },
        ip: req.ip,
      },
    });
  });

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return presentStaffOrder(updated);
}

export async function staffOrders(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "orders.write");
  if (!actor) return null;
  const query = z
    .string()
    .trim()
    .max(80)
    .parse(String(req.query.q ?? ""));
  const orders = await prisma.order.findMany({
    where: ordersInPeriod(query, readPeriod(req.query).window),
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return orders.map(presentStaffOrder);
}

export async function exportOrders(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "reports.read");
  if (!actor) return null;
  const query = z
    .string()
    .trim()
    .max(80)
    .parse(String(req.query.q ?? ""));
  const orders = await prisma.order.findMany({
    where: ordersInPeriod(query, readPeriod(req.query).window),
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { payments: true },
  });
  const header = [
    "number",
    "createdAt",
    "customerName",
    "email",
    "phone",
    "address",
    "preparation",
    "payment",
    "method",
    "piecesFils",
    "deliveryFils",
    "vatFils",
    "totalFils",
  ];
  const lines = orders.map((order) => {
    const payment = order.payments[0];
    return [
      order.number,
      order.createdAt.toISOString(),
      order.customerName,
      order.email,
      order.phone,
      order.addressLine,
      fulfillmentLabel[order.status],
      order.paymentStatus === "PAID"
        ? "Paid"
        : order.paymentStatus === "REFUNDED"
          ? "Refunded"
          : "Unpaid",
      payment?.method === "cod" ? "Cash on delivery" : (payment?.method ?? ""),
      order.subtotalFils,
      order.shippingFils,
      order.vatFils,
      order.totalFils,
    ]
      .map(csvCell)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

const deskRanges = ["today", "7d", "30d", "month", "last", "custom"] as const;
type DeskRange = (typeof deskRanges)[number];

function deskRange(value: unknown): DeskRange {
  const range = String(value ?? "today");
  if ((deskRanges as readonly string[]).includes(range))
    return range as DeskRange;
  throw new HttpError(
    400,
    "Choose today, 7 days, 30 days, this month, last month, or a custom range.",
  );
}

function readPeriod(query: {
  range?: unknown;
  from?: unknown;
  until?: unknown;
}) {
  const range = deskRange(query.range);
  if (range !== "custom") return { range, window: periodWindow(range) };
  const from = calendarDate(query.from);
  const until = calendarDate(query.until);
  if (!from || !until)
    throw new HttpError(400, "Choose a start date and an end date.");
  if (until.stamp < from.stamp)
    throw new HttpError(400, "The end date is before the start date.");
  const end = new Date(Date.UTC(until.year, until.month - 1, until.day + 1));
  return {
    range,
    window: {
      from: dubaiMidnight(from.year, from.month, from.day),
      until: dubaiMidnight(
        end.getUTCFullYear(),
        end.getUTCMonth() + 1,
        end.getUTCDate(),
      ),
    },
  };
}

function calendarDate(value: unknown) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  )
    return null;
  return { year, month, day, stamp: `${match[1]}-${match[2]}-${match[3]}` };
}

function dubaiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function dubaiMidnight(year: number, month: number, day: number) {
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+04:00`,
  );
}

function periodWindow(range: DeskRange) {
  const { year, month, day } = dubaiDate();
  if (range === "month") return { from: dubaiMidnight(year, month, 1) };
  if (range === "last") {
    const previous = new Date(Date.UTC(year, month - 2, 1));
    return {
      from: dubaiMidnight(
        previous.getUTCFullYear(),
        previous.getUTCMonth() + 1,
        1,
      ),
      until: dubaiMidnight(year, month, 1),
    };
  }
  const daysBack = range === "30d" ? 29 : range === "7d" ? 6 : 0;
  const shifted = new Date(Date.UTC(year, month - 1, day - daysBack));
  return {
    from: dubaiMidnight(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      shifted.getUTCDate(),
    ),
  };
}

function placedWhere(window: {
  from: Date;
  until?: Date;
}): Prisma.OrderWhereInput {
  return window.until
    ? { createdAt: { gte: window.from, lt: window.until } }
    : { createdAt: { gte: window.from } };
}

function ordersInPeriod(
  query: string,
  window: { from: Date; until?: Date },
): Prisma.OrderWhereInput {
  const search = orderSearch(query);
  const placed = placedWhere(window);
  return search ? { AND: [placed, search] } : placed;
}

function orderSearch(query: string): Prisma.OrderWhereInput | undefined {
  if (!query) return undefined;
  return {
    OR: [
      { number: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { customerName: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
    ],
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

const auditLabel: Record<string, string> = {
  "product.update": "Piece updated",
  "product.bestseller": "Close edit updated",
  "product.arrival": "New arrival updated",
  "product.collection": "Collection changed",
  "product.compare": "Previous price updated",
  "product.description": "Description updated",
  "product.fabric": "Fabric updated",
  "product.name": "Name updated",
  "product.style": "Style code updated",
  "product.alt": "Photograph line updated",
  "product.place": "Photograph place updated",
  "shipping.rate": "Delivery fee updated",
  "coupon.create": "Coupon created",
  "coupon.update": "Coupon updated",
  "policy.draft": "Draft updated",
  "policy.title": "Draft title updated",
  "policy.line": "Draft line updated",
  "settings.maintenance": "House updated",
  "review.note": "Review updated",
  "category.publish": "Collection updated",
  "category.name": "Collection name updated",
  "category.line": "Collection line updated",
  "length.publish": "Length updated",
  "size.publish": "Size updated",
  "color.publish": "Color updated",
  "fabric.publish": "Bespoke fabric updated",
  "announcement.publish": "Notice updated",
  "announcement.line": "Notice line updated",
  "hours.line": "Boutique hours updated",
  "address.line": "Boutique address updated",
  "phone.line": "Boutique phone updated",
  "instagram.line": "Boutique Instagram updated",
  "facebook.line": "Boutique Facebook updated",
  "maps.line": "Boutique map updated",
  "parent.line": "Parent house updated",
  "story.line": "About story updated",
  "welcome.line": "Contact welcome updated",
  "hero.line": "Homepage line updated",
  "intro.line": "Homepage introduction updated",
  "heading.line": "Story heading updated",
  "fitting.line": "Fitting heading updated",
  "tailoring.line": "Tailoring title updated",
  "precision.line": "Tailoring line updated",
  "premium.line": "Premium title updated",
  "handpick.line": "Premium line updated",
  "craftsmanship.line": "Craftsmanship title updated",
  "detail.line": "Craftsmanship line updated",
  "sample.line": "Sample notes updated",
  "hem.line": "First note updated",
  "sketch.line": "Second note updated",
  "day.line": "Third note updated",
  "notes.line": "Notes heading updated",
  "list.line": "Notes line updated",
  "footer.line": "Footer line updated",
  "ways.line": "Collection heading updated",
  "pieces.line": "Pieces heading updated",
  "follow.line": "Follow heading updated",
  "city.line": "City line updated",
  "collect.line": "Collections eyebrow updated",
  "commission.line": "Commission eyebrow updated",
  "contacteyebrow.line": "Contact eyebrow updated",
  "shopeyebrow.line": "Shop eyebrow updated",
  "appointmenteyebrow.line": "Appointment eyebrow updated",
  "bespokeeyebrow.line": "Bespoke eyebrow updated",
  "policyeyebrow.line": "Policy page eyebrow updated",
  "faqeyebrow.line": "FAQ eyebrow updated",
  "sizeguideeyebrow.line": "Size guide eyebrow updated",
  "trackeyebrow.line": "Track page eyebrow updated",
  "notfoundeyebrow.line": "404 page eyebrow updated",
  "maintenanceeyebrow.line": "Maintenance page eyebrow updated",
  "skulabel.line": "SKU label updated",
  "checkouteyebrow.line": "Checkout eyebrow updated",
  "confirmationeyebrow.line": "Order eyebrow updated",
  "bageyebrow.line": "Bag eyebrow updated",
  "summaryeyebrow.line": "Summary eyebrow updated",
  "accounteyebrow.line": "Account eyebrow updated",
  "wishlisteyebrow.line": "Wishlist eyebrow updated",
  "searcheyebrow.line": "Search eyebrow updated",
  "searchicon.line": "Header Search icon label updated",
  "searchhouse.line": "Search the house label updated",
  "searchpieces.line": "Search pieces placeholder updated",
  "searchsubmit.line": "Search submit button updated",
  "ordernow.line": "Order Now label updated",
  "orderprefill.line": "Order WhatsApp prefill updated",
  "bespokeprefill.line": "Bespoke WhatsApp prefill updated",
  "orderhelpprefill.line": "Order help WhatsApp prefill updated",
  "productprefill.line": "Product WhatsApp prefill updated",
  "checkoutprefill.line": "Checkout WhatsApp prefill updated",
  "bespokesendprefill.line": "Bespoke send WhatsApp prefill updated",
  "sendwhatsapp.line": "Send on WhatsApp label updated",
  "askpiece.line": "Ask about this piece on WhatsApp label updated",
  "tellboutique.line": "Tell the boutique on WhatsApp label updated",
  "waboutique.line": "WhatsApp the boutique label updated",
  "whatsappprefill.line": "WhatsApp prefill updated",
  "appointmentprefill.line": "Appointment WhatsApp prefill updated",
  "sizeguidebanner.line": "Size guide draft banner updated",
  "heroalt.line": "Homepage hero alt updated",
  "storyalt.line": "Homepage story alt updated",
  "aboutalt.line": "About page alt updated",
  "policybanner.line": "Policy draft banner updated",
  "sellers.line": "Best sellers eyebrow updated",
  "debut.line": "New arrival eyebrow updated",
  "abode.line": "The house eyebrow updated",
  "why.line": "Why PERIS eyebrow updated",
  "social.line": "Instagram eyebrow updated",
  "testimonials.line": "Testimonials eyebrow updated",
  "correspondence.line": "Correspondence eyebrow updated",
  "reviewnote.line": "Sample review note updated",
  "instagramlink.line": "Open Instagram link text updated",
  "fittingroom.line": "Testimonials heading updated",
  "explorecta.line": "Explore Our Collections button text updated",
  "chatcta.line": "Chat with Us button text updated",
  "begincta.line": "Begin a commission link text updated",
  "viewedit.line": "View the edit link text updated",
  "viewpiece.line": "View the piece link text updated",
  "readstory.line": "Read the story link text updated",
  "emaillabel.line": "Newsletter email label updated",
  "subscribebtn.line": "Newsletter subscribe button updated",
  "listmsg.line": "Newsletter list message updated",
  "emailerr.line": "Newsletter email error updated",
  "footnews.line": "Footer newsletter heading updated",
  "footemail.line": "Footer email placeholder updated",
  "footsub.line": "Footer subscribe button updated",
  "footlist.line": "Footer list message updated",
  "footerr.line": "Footer email error updated",
  "footquick.line": "Footer quick links heading updated",
  "footsupport.line": "Footer customer support heading updated",
  "footboutique.line": "Footer boutique heading updated",
  "reasonidx1.line": "Why reason 01 number updated",
  "reasonidx2.line": "Why reason 02 number updated",
  "reasonidx3.line": "Why reason 03 number updated",
  "inventory.adjust": "Stock count changed",
  "order.cancel": "Order cancelled",
  "order.status": "Preparation updated",
  "payment.collect": "Cash collected",
  "payment.refund": "Cash refund recorded",
  "bespoke.review": "Request marked in review",
  "bespoke.quote": "Quote sent",
  "bespoke.accept": "Quote accepted",
  "bespoke.decline": "Quote declined",
  "bespoke.convert": "Request placed as an order",
  "customer.note": "Note added",
  "customer.disable": "Account disabled",
  "customer.enable": "Account enabled",
};

export async function staffAudit(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "audit.read");
  if (!actor) return null;
  const query = z
    .string()
    .trim()
    .max(80)
    .parse(String(req.query.q ?? ""));
  const text = { contains: query, mode: "insensitive" as const };
  const rows = await prisma.auditLog.findMany({
    where: query
      ? {
          OR: [
            { action: text },
            { actor: { is: { email: text } } },
            { actor: { is: { firstName: text } } },
            { actor: { is: { lastName: text } } },
            { metadata: { path: ["number"], string_contains: query } },
            { metadata: { path: ["orderNumber"], string_contains: query } },
            { metadata: { path: ["sku"], string_contains: query } },
            { metadata: { path: ["slug"], string_contains: query } },
            { metadata: { path: ["id"], string_contains: query } },
            { metadata: { path: ["reason"], string_contains: query } },
          ],
        }
      : undefined,
    include: { actor: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : "Desk",
    label: auditLabel[row.action] ?? row.action,
    detail: auditDetail(row.action, row.metadata),
  }));
}

export async function staffCustomers(req: Request, res: Response) {
  const actor = await requireStaff(req, res, "customers.read");
  if (!actor) return null;
  const query = z
    .string()
    .trim()
    .max(80)
    .parse(String(req.query.q ?? ""));
  const text = { contains: query, mode: "insensitive" as const };
  const users = await prisma.user.findMany({
    where: {
      accountType: "CUSTOMER",
      ...(query
        ? {
            OR: [
              { email: text },
              { firstName: text },
              { lastName: text },
              { phone: { contains: query } },
              { addresses: { some: { phone: { contains: query } } } },
            ],
          }
        : {}),
    },
    include: {
      orders: { select: { paymentStatus: true, status: true } },
      addresses: {
        where: { isDefault: true },
        take: 1,
        select: { phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone || user.addresses[0]?.phone || "",
    status: user.status,
    orders: user.orders.length,
    unpaid: user.orders.filter(
      (order) =>
        order.paymentStatus === "UNPAID" && order.status !== "CANCELLED",
    ).length,
    createdAt: user.createdAt.toISOString(),
  }));
}

const bespokeLabel: Record<string, string> = {
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  REJECTED: "Declined",
  CONVERTED: "Converted to an order",
  CANCELLED: "Cancelled",
};

export async function staffCustomer(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "customers.read");
  if (!actor) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      measurements: { orderBy: { id: "asc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      bespokeRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          quotes: {
            where: { status: { in: ["SENT", "ACCEPTED", "REJECTED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      notesAbout: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!user || user.accountType !== "CUSTOMER")
    throw new HttpError(404, "That customer is not on the desk.");
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone || user.addresses[0]?.phone || "",
    status: user.status,
    addresses: user.addresses.map((address) => ({
      id: address.id,
      line: [address.street, address.building, address.apartment]
        .filter((part) => part && part.trim().length > 0)
        .join(", "),
      city: address.city,
      phone: address.phone,
      isDefault: address.isDefault,
    })),
    measurements: user.measurements.map((row) => ({
      id: row.id,
      label: row.label,
      heightCm: centimetres(row.heightCm),
      shoulderCm: centimetres(row.shoulderCm),
      sleeveCm: centimetres(row.sleeveCm),
      chestCm: centimetres(row.chestCm),
      waistCm: centimetres(row.waistCm),
      abayaLengthIn: row.abayaLengthIn,
      notes: row.notes,
    })),
    orders: user.orders.map((order) => ({
      number: order.number,
      totalFils: order.totalFils,
      payment:
        order.paymentStatus === "PAID"
          ? "Paid"
          : order.paymentStatus === "REFUNDED"
            ? "Refunded"
            : "Unpaid",
      statusLabel: fulfillmentLabel[order.status],
      createdAt: order.createdAt.toISOString(),
    })),
    requests: user.bespokeRequests.map((request) => ({
      number: request.number,
      statusLabel: bespokeLabel[request.status] ?? request.status,
      amountFils: request.quotes[0]?.amountFils ?? null,
    })),
    notes: user.notesAbout.map((entry) => ({
      id: entry.id,
      body: entry.body,
      author: `${entry.author.firstName} ${entry.author.lastName}`,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

const noteSchema = z.object({
  body: z.string().trim().min(2).max(500),
});

export async function addCustomerNote(req: Request, res: Response, id: string) {
  const actor = await requireStaff(req, res, "customers.write");
  if (!actor) return null;
  const input = noteSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.accountType !== "CUSTOMER")
    throw new HttpError(404, "That customer is not on the desk.");
  const entry = await prisma.customerNote.create({
    data: { customerId: user.id, authorId: actor.id, body: input.body },
    include: { author: { select: { firstName: true, lastName: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "customer.note",
      entityType: "User",
      entityId: user.id,
      metadata: { name: `${user.firstName} ${user.lastName}` },
      ip: req.ip,
    },
  });
  return {
    id: entry.id,
    body: entry.body,
    author: `${entry.author.firstName} ${entry.author.lastName}`,
    createdAt: entry.createdAt.toISOString(),
  };
}

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export async function setCustomerStatus(
  req: Request,
  res: Response,
  id: string,
) {
  const actor = await requireStaff(req, res, "customers.write");
  if (!actor) return null;
  const input = statusSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.accountType !== "CUSTOMER")
    throw new HttpError(404, "That customer is not on the desk.");
  if (user.status === input.status) return { id: user.id, status: user.status };
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { status: input.status },
    }),
    ...(input.status === "DISABLED"
      ? [
          prisma.refreshToken.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
          }),
        ]
      : []),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action:
          input.status === "DISABLED" ? "customer.disable" : "customer.enable",
        entityType: "User",
        entityId: user.id,
        metadata: { name: `${user.firstName} ${user.lastName}` },
        ip: req.ip,
      },
    }),
  ]);
  return { id: user.id, status: input.status };
}

function auditDetail(action: string, metadata: Prisma.JsonValue) {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata
      : {};
  const number = typeof meta.number === "string" ? meta.number : "";
  if (action === "product.update") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    const shown =
      meta.toPublished === true
        ? "Shown on the shop."
        : "Hidden from the shop.";
    return `${slug}. ${dirhams(meta.fromPriceFils)} to ${dirhams(meta.toPriceFils)}. ${shown}`;
  }
  if (action === "product.bestseller") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    return `${slug}. ${meta.toBestseller === true ? "Kept close." : "Left the close edit."}`;
  }
  if (action === "product.arrival") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    return `${slug}. ${meta.toNew === true ? "Shown as new." : "Left the new arrivals."}`;
  }
  if (action === "product.collection") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    const toSlug = typeof meta.toSlug === "string" ? meta.toSlug : "Collection";
    return `${slug}. ${toSlug}.`;
  }
  if (action === "product.compare") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    const from =
      typeof meta.fromCompareFils === "number"
        ? dirhams(meta.fromCompareFils)
        : "None";
    const to =
      typeof meta.toCompareFils === "number"
        ? dirhams(meta.toCompareFils)
        : "None";
    return `${slug}. ${from} to ${to}.`;
  }
  if (action === "product.description") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    return `${slug}.`;
  }
  if (action === "product.fabric") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    return `${slug}.`;
  }
  if (action === "product.name" || action === "product.style") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    return `${slug}.`;
  }
  if (action === "product.alt" || action === "product.place") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Piece";
    return `${slug}.`;
  }
  if (action === "shipping.rate") {
    const zone = typeof meta.zone === "string" ? meta.zone : "Delivery";
    return `${zone}. ${dirhams(meta.fromPriceFils)} to ${dirhams(meta.toPriceFils)}.`;
  }
  if (action === "policy.title" || action === "policy.line") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Draft";
    return `${slug}.`;
  }
  if (action === "policy.draft") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Draft";
    return `${slug}. ${meta.toShown === true ? "Shown on the shop." : "Hidden from the shop."}`;
  }
  if (action === "settings.maintenance") {
    return meta.toClosed === true ? "Closed." : "Open.";
  }
  if (action === "review.note") {
    const name = typeof meta.name === "string" ? meta.name : "Note";
    const slug = typeof meta.slug === "string" ? meta.slug : "";
    const shown = meta.toStatus === "APPROVED" ? "On the shop." : "Hidden.";
    return [name, slug, shown].filter(Boolean).join(". ");
  }
  if (action === "category.publish") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Collection";
    return `${slug}. ${meta.toPublished === true ? "Shown on the shop." : "Hidden from the shop."}`;
  }
  if (action === "category.name" || action === "category.line") {
    const slug = typeof meta.slug === "string" ? meta.slug : "Collection";
    return `${slug}.`;
  }
  if (action === "fabric.publish") {
    const name = typeof meta.name === "string" ? meta.name : "Fabric";
    return `${name}. ${meta.toActive === true ? "Shown on the shop." : "Hidden from the shop."}`;
  }
  if (action === "color.publish") {
    const name = typeof meta.name === "string" ? meta.name : "Color";
    return `${name}. ${meta.toActive === true ? "Shown on the shop." : "Hidden from the shop."}`;
  }
  if (action === "size.publish") {
    const code = typeof meta.code === "string" ? meta.code : "Size";
    return `${code}. ${meta.toActive === true ? "Shown on the shop." : "Hidden from the shop."}`;
  }
  if (action === "length.publish") {
    const inches =
      typeof meta.inches === "number" ? `${meta.inches} in` : "Length";
    return `${inches}. ${meta.toActive === true ? "Shown on the shop." : "Hidden from the shop."}`;
  }
  if (action === "announcement.publish") {
    return meta.toActive === true
      ? "Shown on the shop."
      : "Hidden from the shop.";
  }
  if (action === "announcement.line") {
    return "Hours.";
  }
  if (action === "hours.line") {
    return "Boutique pages.";
  }
  if (
    action === "address.line" ||
    action === "phone.line" ||
    action === "instagram.line" ||
    action === "facebook.line" ||
    action === "maps.line" ||
    action === "parent.line" ||
    action === "story.line" ||
    action === "welcome.line" ||
    action === "hero.line" ||
    action === "intro.line" ||
    action === "heading.line" ||
    action === "fitting.line" ||
    action === "tailoring.line" ||
    action === "precision.line" ||
    action === "premium.line" ||
    action === "handpick.line" ||
    action === "craftsmanship.line" ||
    action === "detail.line" ||
    action === "sample.line" ||
    action === "hem.line" ||
    action === "sketch.line" ||
    action === "day.line" ||
    action === "notes.line" ||
    action === "list.line" ||
    action === "footer.line" ||
    action === "ways.line" ||
    action === "pieces.line" ||
    action === "follow.line" ||
    action === "city.line" ||
    action === "collect.line" ||
    action === "commission.line" ||
    action === "contacteyebrow.line" ||
    action === "shopeyebrow.line" ||
    action === "appointmenteyebrow.line" ||
    action === "bespokeeyebrow.line" ||
    action === "policyeyebrow.line" ||
    action === "faqeyebrow.line" ||
    action === "sizeguideeyebrow.line" ||
    action === "trackeyebrow.line" ||
    action === "notfoundeyebrow.line" ||
    action === "maintenanceeyebrow.line" ||
    action === "skulabel.line" ||
    action === "checkouteyebrow.line" ||
    action === "confirmationeyebrow.line" ||
    action === "bageyebrow.line" ||
    action === "summaryeyebrow.line" ||
    action === "accounteyebrow.line" ||
    action === "wishlisteyebrow.line" ||
    action === "searcheyebrow.line" ||
    action === "searchicon.line" ||
    action === "searchhouse.line" ||
    action === "searchpieces.line" ||
    action === "searchsubmit.line" ||
    action === "ordernow.line" ||
    action === "orderprefill.line" ||
    action === "bespokeprefill.line" ||
    action === "orderhelpprefill.line" ||
    action === "productprefill.line" ||
    action === "checkoutprefill.line" ||
    action === "bespokesendprefill.line" ||
    action === "sendwhatsapp.line" ||
    action === "askpiece.line" ||
    action === "tellboutique.line" ||
    action === "waboutique.line" ||
    action === "whatsappprefill.line" ||
    action === "appointmentprefill.line" ||
    action === "sizeguidebanner.line" ||
    action === "heroalt.line" ||
    action === "storyalt.line" ||
    action === "aboutalt.line" ||
    action === "policybanner.line" ||
    action === "sellers.line" ||
    action === "debut.line" ||
    action === "abode.line" ||
    action === "why.line" ||
    action === "social.line" ||
    action === "testimonials.line" ||
    action === "correspondence.line" ||
    action === "reviewnote.line" ||
    action === "instagramlink.line" ||
    action === "fittingroom.line" ||
    action === "explorecta.line" ||
    action === "chatcta.line" ||
    action === "begincta.line" ||
    action === "viewedit.line" ||
    action === "viewpiece.line" ||
    action === "readstory.line" ||
    action === "emaillabel.line" ||
    action === "subscribebtn.line" ||
    action === "listmsg.line" ||
    action === "emailerr.line" ||
    action === "footnews.line" ||
    action === "footemail.line" ||
    action === "footsub.line" ||
    action === "footlist.line" ||
    action === "footerr.line" ||
    action === "footquick.line" ||
    action === "footsupport.line" ||
    action === "footboutique.line" ||
    action === "reasonidx1.line" ||
    action === "reasonidx2.line" ||
    action === "reasonidx3.line"
  ) {
    return "Boutique pages.";
  }
  if (action === "inventory.adjust") {
    const sku = typeof meta.sku === "string" ? meta.sku : "Size";
    const delta =
      typeof meta.delta === "number"
        ? meta.delta > 0
          ? `+${meta.delta}`
          : String(meta.delta)
        : "";
    const reason = typeof meta.reason === "string" ? meta.reason : "";
    return [sku, delta, reason].filter(Boolean).join(". ");
  }
  if (action === "order.status") {
    const tracking =
      typeof meta.trackingNumber === "string" && meta.trackingNumber
        ? ` Tracking ${meta.trackingNumber}.`
        : "";
    return `${number}. ${statusName(meta.from)} to ${statusName(meta.to)}.${tracking}`;
  }
  if (
    action === "payment.collect" ||
    action === "payment.refund" ||
    action === "bespoke.quote" ||
    action === "bespoke.accept" ||
    action === "bespoke.decline"
  ) {
    return [number, dirhams(meta.amountFils)].filter(Boolean).join(". ");
  }
  if (action === "bespoke.convert") {
    const orderNumber =
      typeof meta.orderNumber === "string" ? meta.orderNumber : "";
    return [`${number} placed as ${orderNumber}`, dirhams(meta.totalFils)]
      .filter(Boolean)
      .join(". ");
  }
  if (
    action === "customer.note" ||
    action === "customer.disable" ||
    action === "customer.enable"
  ) {
    return typeof meta.name === "string" ? meta.name : "";
  }
  return number;
}

function centimetres(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dirhams(value: unknown) {
  return typeof value === "number"
    ? `AED ${Math.round(value / 100).toLocaleString("en-AE")}`
    : "";
}

function statusName(value: unknown) {
  return typeof value === "string" && value in fulfillmentLabel
    ? fulfillmentLabel[value as OrderStatus]
    : "";
}

export async function advanceFulfillment(
  req: Request,
  res: Response,
  number: string,
) {
  const actor = await requireStaff(req, res, "orders.write");
  if (!actor) return null;
  const input = advanceSchema.parse(req.body);
  const order = await prisma.order.findUnique({
    where: { number: number.trim() },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) throw new HttpError(404, "That order is not on the desk.");
  const allowed = nextSteps(order.status).some(
    (step) => step.status === input.status,
  );
  if (!allowed)
    throw new HttpError(409, "That step does not follow the current one.");
  const trackingNumber = input.trackingNumber?.trim() ?? "";
  const trackingUrl = input.trackingUrl?.trim() || null;
  if (input.status === "SHIPPED" && trackingNumber.length === 0) {
    throw new HttpError(
      400,
      "Add the tracking number before handing the order to the courier.",
    );
  }
  const carrier = input.carrier?.trim() || "Courier";
  const note =
    input.status === "SHIPPED"
      ? `${fulfillmentLabel.SHIPPED}. Tracking ${trackingNumber}.`
      : fulfillmentLabel[input.status];

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: input.status },
    }),
    prisma.orderEvent.create({
      data: { orderId: order.id, status: input.status, note },
    }),
    ...(input.status === "SHIPPED"
      ? [
          prisma.shipment.create({
            data: {
              orderId: order.id,
              carrier,
              trackingNumber,
              trackingUrl,
              status: "SHIPPED",
            },
          }),
        ]
      : []),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "order.status",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          number: order.number,
          from: order.status,
          to: input.status,
          trackingNumber: trackingNumber || null,
          trackingUrl,
        },
        ip: req.ip,
      },
    }),
  ]);

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (input.status === "SHIPPED") {
    await sendOrderShipped({
      to: order.email,
      customerName: order.customerName,
      number: order.number,
      trackingNumber,
      carrier,
      trackingUrl,
    });
  } else if (
    input.status === "READY_FOR_SHIPMENT" ||
    input.status === "OUT_FOR_DELIVERY" ||
    input.status === "DELIVERED"
  ) {
    await sendOrderStatus({
      to: order.email,
      customerName: order.customerName,
      number: order.number,
      statusLabel: fulfillmentLabel[input.status],
      note: note,
    });
  }

  return presentStaffOrder(updated);
}

export async function recordCollection(
  req: Request,
  res: Response,
  number: string,
) {
  const actor = await requireStaff(req, res, "orders.write");
  if (!actor) return null;
  const order = await prisma.order.findUnique({
    where: { number: number.trim() },
    include: { payments: true },
  });
  if (!order) throw new HttpError(404, "That order is not on the desk.");
  if (order.status === "CANCELLED")
    throw new HttpError(
      409,
      "A cancelled order cannot be recorded as collected.",
    );
  const payment = order.payments.find(
    (item) => item.method === "cod" && item.provider === "cod",
  );
  if (!payment)
    throw new HttpError(
      409,
      "Only a cash-on-delivery order can be recorded here.",
    );
  if (payment.status === "PAID" || order.paymentStatus === "PAID") {
    throw new HttpError(409, "Collection is already recorded.");
  }
  if (payment.status !== "UNPAID")
    throw new HttpError(
      409,
      "This payment can no longer be recorded as collected.",
    );

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID" },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID" },
    }),
    prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        provider: "cod",
        eventId: `cod-collect:${payment.id}`,
        payload: { recordedBy: actor.id, number: order.number },
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: "Cash collected and recorded by staff.",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "payment.collect",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          number: order.number,
          amountFils: payment.amountFils,
          method: "cod",
        },
        ip: req.ip,
      },
    }),
  ]);

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return presentStaffOrder(updated);
}

export async function requireStaff(
  req: Request,
  res: Response,
  permission: string,
) {
  if (!req.headers.authorization) {
    res.status(401).json({ error: "Sign in to the staff entrance." });
    return null;
  }
  const claims = readStaff(req);
  if (!claims) {
    res.status(401).json({ error: "Sign in again to the staff entrance." });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!user || user.status !== "ACTIVE" || user.accountType !== "STAFF") {
    res.status(401).json({ error: "Sign in again to the staff entrance." });
    return null;
  }
  const granted =
    user.role?.permissions.some((item) => item.permission.key === permission) ??
    false;
  if (!granted) {
    res.status(403).json({ error: "This desk does not allow that action." });
    return null;
  }
  return user;
}

export async function staffOrderSheet(
  req: Request,
  res: Response,
  number: string,
) {
  const actor = await requireStaff(req, res, "orders.write");
  if (!actor) return null;
  const order = await prisma.order.findUnique({
    where: { number: number.trim() },
    include: { items: true, payments: true },
  });
  if (!order) throw new HttpError(404, "That order is not on the desk.");
  const payment = order.payments[0];
  return {
    number: order.number,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    addressLine: order.addressLine,
    statusLabel: fulfillmentLabel[order.status],
    payment:
      order.paymentStatus === "PAID"
        ? "Paid"
        : order.paymentStatus === "REFUNDED"
          ? "Refunded"
          : "Unpaid",
    method:
      payment?.method === "cod" ? "Cash on delivery" : (payment?.method ?? ""),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      size: item.size,
      fabric: item.fabric,
      lengthLabel: item.lengthLabel,
      quantity: item.quantity,
      unitPriceFils: item.unitPriceFils,
      lineTotalFils: item.lineTotalFils,
    })),
    subtotalFils: order.subtotalFils,
    shippingFils: order.shippingFils,
    vatFils: order.vatFils,
    totalFils: order.totalFils,
  };
}

function presentStaffOrder(order: {
  number: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  status: OrderStatus;
  paymentStatus: string;
  totalFils: number;
  createdAt: Date;
  items: {
    name: string;
    color: string;
    size: string;
    lengthLabel: string | null;
    quantity: number;
  }[];
  payments: { method: string; status: string }[];
  shipments: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
  }[];
}) {
  const payment = order.payments[0];
  const shipment = order.shipments[0];
  return {
    number: order.number,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    addressLine: order.addressLine,
    status: order.status,
    statusLabel: fulfillmentLabel[order.status],
    nextSteps: nextSteps(order.status),
    paymentStatus: order.paymentStatus,
    method: payment?.method ?? "",
    totalFils: order.totalFils,
    createdAt: order.createdAt,
    paid: order.paymentStatus === "PAID",
    canCancel:
      order.paymentStatus === "UNPAID" &&
      order.payments.some(
        (item) => item.method === "cod" && item.status === "UNPAID",
      ) &&
      cancellable.has(order.status),
    canRefund:
      order.paymentStatus === "PAID" &&
      order.payments.some(
        (item) => item.method === "cod" && item.status === "PAID",
      ),
    trackingNumber: shipment?.trackingNumber ?? null,
    trackingUrl: shipment?.trackingUrl ?? null,
    carrier: shipment?.carrier ?? null,
    items: order.items.map((item) => ({
      name: item.name,
      color: item.color,
      size: item.size,
      lengthLabel: item.lengthLabel,
      quantity: item.quantity,
    })),
  };
}

function presentStock(variant: {
  id: string;
  productId: string;
  stockOnHand: number;
  stockReserved: number;
  product: { name: string };
  color: { name: string };
  size: { code: string; sortOrder: number };
}) {
  return {
    id: variant.id,
    productId: variant.productId,
    productName: variant.product.name,
    color: variant.color.name,
    size: variant.size.code,
    sizeOrder: variant.size.sortOrder,
    available: variant.stockOnHand - variant.stockReserved,
  };
}

function presentStaffProduct(product: {
  id: string;
  name: string;
  slug: string;
  styleCode: string;
  description: string;
  fabricDetails: string;
  basePriceFils: number;
  compareAtFils: number | null;
  isPublished: boolean;
  isPlaceholder: boolean;
  isBestseller: boolean;
  isNew: boolean;
  categories: { category: { slug: string; name: string } }[];
  images?: {
    id: string;
    url?: string;
    alt: string;
    position?: string | null;
    sortOrder?: number;
    colorId?: string | null;
    color?: { id: string; name: string; hex: string } | null;
  }[];
  variants?: {
    color: { id: string; name: string; hex: string; isActive: boolean };
  }[];
}) {
  const collection = product.categories[0]?.category;
  const images = (product.images ?? []).map((image) => ({
    id: image.id,
    url: image.url ?? "",
    alt: image.alt,
    position: image.position || "center",
    sortOrder: image.sortOrder ?? 0,
    colorId: image.colorId ?? null,
    colorName: image.color?.name ?? null,
  }));
  const primary = images[0];
  const hover = images[1];
  const colors = new Map<string, { id: string; name: string; hex: string }>();
  for (const variant of product.variants ?? []) {
    if (!variant.color.isActive) continue;
    colors.set(variant.color.id, {
      id: variant.color.id,
      name: variant.color.name,
      hex: variant.color.hex,
    });
  }
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    styleCode: product.styleCode,
    imageUrl: primary?.url ?? "",
    hoverImageUrl: hover?.url ?? "",
    images,
    colors: [...colors.values()],
    alt: primary?.alt ?? "",
    position: primary?.position || "center",
    description: product.description,
    fabric: product.fabricDetails,
    priceFils: product.basePriceFils,
    compareAtFils: product.compareAtFils,
    isPublished: product.isPublished,
    isPlaceholder: product.isPlaceholder,
    isBestseller: product.isBestseller,
    isNew: product.isNew,
    collectionSlug: collection?.slug ?? "",
    collectionName: collection?.name ?? "",
  };
}

async function presentedProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        include: { color: true },
      },
      variants: { include: { color: true } },
    },
  });
  if (!product) throw new HttpError(404, "That piece is not on the desk.");
  return presentStaffProduct(product);
}

function publicStaff(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    name: string;
    permissions?: { permission: { key: string } }[];
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role?.name ?? "",
    permissions:
      user.role?.permissions?.map((item) => item.permission.key) ?? [],
  };
}

async function issueStaffSession(
  res: Response,
  user: { id: string; email: string },
) {
  const refresh = randomBytes(32).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
    },
  });
  res.cookie(staffCookie, refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/admin/auth",
    maxAge: refreshDays * 24 * 60 * 60 * 1000,
  });
  return signStaffAccess(user);
}

function clearStaffCookie(res: Response) {
  res.clearCookie(staffCookie, {
    path: "/api/v1/admin/auth",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
