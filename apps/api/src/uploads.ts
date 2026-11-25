import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./cart.js";
import { requireStaff } from "./staff.js";

const storageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../storage",
);

const allowedTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const uploadSchema = z.object({
  kind: z.enum(["product", "brand"]),
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  data: z.string().min(1).max(10_000_000),
});

export function uploadsStaticRoot() {
  return storageRoot;
}

export async function createStaffUpload(req: Request, res: Response) {
  const input = uploadSchema.parse(req.body);
  const permission =
    input.kind === "brand" ? "settings.write" : "products.write";
  const actor = await requireStaff(req, res, permission);
  if (!actor) return null;

  const extension = allowedTypes[input.contentType];
  if (!extension)
    throw new HttpError(400, "Use a JPEG, PNG, WebP, or GIF image.");

  const raw = input.data.includes(",")
    ? input.data.slice(input.data.indexOf(",") + 1)
    : input.data;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw new HttpError(400, "The image could not be read.");
  }
  if (buffer.length < 32) throw new HttpError(400, "The image file is empty.");
  if (buffer.length > 6_000_000)
    throw new HttpError(400, "Keep the image under 6 MB.");

  const folder = input.kind === "brand" ? "brand" : "media";
  const digest = createHash("sha1").update(buffer).digest("hex").slice(0, 10);
  const name = `${Date.now().toString(36)}-${digest}-${randomBytes(3).toString("hex")}${extension}`;
  const directory = path.join(storageRoot, folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), buffer);

  return {
    url: `/api/v1/files/${folder}/${name}`,
    kind: input.kind,
    bytes: buffer.length,
  };
}
