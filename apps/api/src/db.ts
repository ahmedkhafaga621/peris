import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);

function createPrisma(): PrismaClient {
  if (process.env.DB_HOST) {
    const generated = require("./generated/mysql") as {
      PrismaClient: new () => PrismaClient;
    };
    return new generated.PrismaClient();
  }
  return new PrismaClient();
}

export const prisma = createPrisma();
