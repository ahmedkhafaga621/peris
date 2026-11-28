import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./loadEnv.js";

loadEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type DbTarget = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  local: boolean;
};

function connectionTarget(url: string | undefined): DbTarget | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, "") || "peris");
    return {
      host,
      port: Number(parsed.port || 5432),
      user: decodeURIComponent(parsed.username || "peris"),
      password: decodeURIComponent(parsed.password || "peris"),
      database,
      local: host === "localhost" || host === "127.0.0.1" || host === "::1",
    };
  } catch {
    return null;
  }
}

function portOpen(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host, port });
    const done = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(3000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function startEmbedded(target: DbTarget) {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const databaseDir = path.join(root, "data", "pg");
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: target.user,
    password: target.password,
    port: target.port,
    persistent: true,
  });
  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
    await postgres.initialise();
  }
  await postgres.start();
  try {
    await postgres.createDatabase(target.database);
  } catch {
    // The database already exists on later runs.
  }
  const user = encodeURIComponent(target.user);
  const password = encodeURIComponent(target.password);
  process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${target.port}/${target.database}?schema=public`;
}

const configuredUrl = process.env.DATABASE_URL;
const configured = connectionTarget(configuredUrl);
const reachable = configured ? await portOpen(configured.host, configured.port) : false;

if (!reachable) {
  if (configured && !configured.local) {
    console.error(
      "DATABASE_URL points at a Postgres server that did not answer. The API will not start until that database is reachable.",
    );
    process.exit(1);
  }
  const embedded: DbTarget = configured?.local
    ? { ...configured, host: "127.0.0.1" }
    : {
        host: "127.0.0.1",
        port: 5433,
        user: "peris",
        password: "peris",
        database: "peris",
        local: true,
      };
  console.log("No reachable Postgres was configured. Starting the bundled database.");
  await startEmbedded(embedded);
}

execSync("npx prisma migrate deploy", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

const { PrismaClient } = await import("@prisma/client");
const probe = new PrismaClient();
try {
  const categories = await probe.category.count();
  if (categories === 0) {
    console.log("Database has no categories. Seeding the catalog.");
    execSync("npx tsx prisma/seed.ts", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  }
} finally {
  await probe.$disconnect();
}

await import("./index.js");
