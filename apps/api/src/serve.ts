import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./loadEnv.js";

const require = createRequire(import.meta.url);

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

function packageFile(name: string, relativeFile: string) {
  return path.join(path.dirname(require.resolve(`${name}/package.json`)), relativeFile);
}

function runNode(script: string, args: string[]) {
  execFileSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

const runningAsRoot =
  typeof process.getuid === "function" && process.getuid() === 0;

async function startEmbedded(target: DbTarget) {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const databaseDir = path.join(root, "data", "pg");
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: target.user,
    password: target.password,
    port: target.port,
    persistent: true,
    // Hosts such as the production container start Node as root. Postgres
    // refuses that, so the bundled database has to run as its own user.
    createPostgresUser: runningAsRoot,
    initdbFlags: ["--locale=C", "--encoding=UTF8"],
    onLog: (message) => console.log(message),
    onError: (message) => console.error(message),
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
let reachable = configured ? await portOpen(configured.host, configured.port) : false;
if (configured && !configured.local && !reachable) {
  for (let attempt = 0; attempt < 10 && !reachable; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    reachable = await portOpen(configured.host, configured.port);
  }
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
const useEmbedded = !reachable && !(configured && !configured.local);
if (useEmbedded) {
  const user = encodeURIComponent(embedded.user);
  const password = encodeURIComponent(embedded.password);
  process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${embedded.port}/${embedded.database}?schema=public`;
}

if (configured && !configured.local && !reachable) {
  console.error(
    "DATABASE_URL points at a Postgres server that did not answer. The API will stay up, and shop data will fail until that database is reachable.",
  );
}

await import("./index.js");

try {
  if (useEmbedded) {
    console.log("No reachable Postgres was configured. Starting the bundled database.");
    await startEmbedded(embedded);
  }

  if (useEmbedded || reachable) {
    runNode(packageFile("prisma", "build/index.js"), ["migrate", "deploy"]);

    const { PrismaClient } = await import("@prisma/client");
    const probe = new PrismaClient();
    try {
      const categories = await probe.category.count();
      if (categories === 0) {
        console.log("Database has no categories. Seeding the catalog.");
        runNode(packageFile("tsx", "dist/cli.mjs"), ["prisma/seed.ts"]);
      }
    } finally {
      await probe.$disconnect();
    }
  }
} catch (error) {
  console.error(
    "PERIS database setup failed. The API is still listening.",
    error instanceof Error ? error.message : error,
  );
}
