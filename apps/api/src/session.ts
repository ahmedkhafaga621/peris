import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

const refreshCookie = "peris_refresh";
const refreshDays = 30;

export type CustomerClaims = { sub: string; email: string; accountType: "CUSTOMER" };

function accessSecret() {
  return process.env.JWT_ACCESS_SECRET ?? "dev-only-access-secret";
}

export function signAccess(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email, accountType: "CUSTOMER" }, accessSecret(), { expiresIn: "15m" });
}

export function readAccess(req: Request): CustomerClaims | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), accessSecret());
    if (typeof payload === "string" || payload.accountType !== "CUSTOMER" || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, email: String(payload.email ?? ""), accountType: "CUSTOMER" };
  } catch {
    return null;
  }
}

export async function requireCustomer(req: Request, res: Response) {
  if (!req.headers.authorization) {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }
  const claims = readAccess(req);
  if (!claims) {
    res.status(401).json({ error: "Sign in again to continue." });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { status: true, accountType: true } });
  if (!user || user.status !== "ACTIVE" || user.accountType !== "CUSTOMER") {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }
  return claims.sub;
}

export function readCookie(req: Request, name: string) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/auth",
    maxAge: refreshDays * 24 * 60 * 60 * 1000,
  };
}

export async function issueSession(res: Response, user: { id: string; email: string }) {
  const refresh = randomBytes(32).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
    },
  });
  res.cookie(refreshCookie, refresh, refreshCookieOptions());
  return signAccess(user);
}

export async function rotateSession(req: Request, res: Response) {
  const refresh = readCookie(req, refreshCookie);
  if (!refresh) return null;
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refresh) } });
  if (!existing || existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
    clearSessionCookie(res);
    return null;
  }
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || user.status !== "ACTIVE" || user.accountType !== "CUSTOMER") {
    clearSessionCookie(res);
    return null;
  }
  const accessToken = await issueSession(res, user);
  return { accessToken, user };
}

export async function revokeSession(req: Request, res: Response) {
  const refresh = readCookie(req, refreshCookie);
  if (refresh) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearSessionCookie(res);
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(refreshCookie, { path: "/api/v1/auth", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
