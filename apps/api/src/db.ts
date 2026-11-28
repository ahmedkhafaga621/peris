import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);

function createPrisma(): PrismaClient {
  if (process.env.DB_HOST) {
    try {
      const generated = require("./generated/mysql") as {
        PrismaClient: new () => PrismaClient;
      };
      return new generated.PrismaClient();
    } catch (error) {
      console.error(
        "The MySQL client is not ready.",
        error instanceof Error ? error.message : error,
      );
    }
  }
  try {
    return new PrismaClient();
  } catch (error) {
    console.error(
      "The database client is not ready.",
      error instanceof Error ? error.message : error,
    );
    const message = process.env.PERIS_DATABASE_ERROR || "The database client is not ready.";
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(message);
      },
    });
  }
}

export const prisma = createPrisma();
