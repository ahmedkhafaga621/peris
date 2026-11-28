import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

function managedMysqlUrl() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!host || !port || !name || !user || password == null) return null;
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

function writeMysqlSchema() {
  const source = readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8");
  const mysql = source
    .replace(
      /generator client \{[\s\S]*?\}/,
      'generator client {\n  provider = "prisma-client-js"\n  output   = "../src/generated/mysql"\n}',
    )
    .replace(
      /datasource db \{[\s\S]*?\}/,
      'datasource db {\n  provider = "mysql"\n  url      = env("DATABASE_URL")\n}',
    );
  writeFileSync(path.join(root, "prisma", "schema.mysql.prisma"), mysql);
}

const runningAsRoot =
  typeof process.getuid === "function" && process.getuid() === 0;

function postgresDataDir() {
  const preferred = path.join(root, "data", "pg");
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), "peris-pg");
    mkdirSync(fallback, { recursive: true });
    console.error("The app folder is not writable. The database will use temporary storage.");
    return fallback;
  }
}

function ensureMessagesLocale() {
  try {
    execFileSync("localedef", ["-c", "-i", "en_US", "-f", "UTF-8", "en_US.UTF-8"], {
      stdio: "ignore",
    });
  } catch {
    // The host already has this locale, or it has no localedef command.
  }
}

async function startEmbedded(target: DbTarget) {
  ensureMessagesLocale();
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const databaseDir = postgresDataDir();
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

const mysqlUrl = managedMysqlUrl();

if (mysqlUrl) {
  console.log("Using the hosting MySQL database.");
  process.env.DATABASE_URL = mysqlUrl;
  try {
    writeMysqlSchema();
    runNode(packageFile("prisma", "build/index.js"), [
      "generate",
      "--schema",
      "prisma/schema.mysql.prisma",
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The database did not start.";
    process.env.PERIS_DATABASE_ERROR = message.slice(0, 300);
    console.error("PERIS database setup failed. The API is still listening.", message);
  }
  await import("./index.js");
  if (!process.env.PERIS_DATABASE_ERROR) {
    try {
      runNode(packageFile("prisma", "build/index.js"), [
        "db",
        "push",
        "--schema",
        "prisma/schema.mysql.prisma",
        "--skip-generate",
        "--accept-data-loss",
      ]);
      const generated = (await import(
        pathToFileURL(path.join(root, "src", "generated", "mysql", "index.js")).href
      )) as { PrismaClient: new () => { category: { count(): Promise<number> }; $disconnect(): Promise<void> } };
      const probe = new generated.PrismaClient();
      try {
        const categories = await probe.category.count();
        if (categories === 0) {
          console.log("Database has no categories. Seeding the catalog.");
          runNode(packageFile("tsx", "dist/cli.mjs"), ["prisma/seed.ts"]);
        }
      } finally {
        await probe.$disconnect();
      }
      runNode(packageFile("tsx", "dist/cli.mjs"), ["prisma/publishHouse.ts"]);
      delete process.env.PERIS_DATABASE_ERROR;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The database did not start.";
      process.env.PERIS_DATABASE_ERROR = message.slice(0, 300);
      console.error("PERIS database setup failed. The API is still listening.", message);
    }
  }
} else {
const configuredUrl = process.env.DATABASE_URL;
const configured = connectionTarget(configuredUrl);
const reachable = configured ? await portOpen(configured.host, configured.port) : false;

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
const useEmbedded = !reachable;
if (useEmbedded) {
  if (configured && !configured.local) {
    console.error("DATABASE_URL did not answer. Starting the bundled database instead.");
  }
  const user = encodeURIComponent(embedded.user);
  const password = encodeURIComponent(embedded.password);
  process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${embedded.port}/${embedded.database}?schema=public`;
}

try {
  runNode(packageFile("prisma", "build/index.js"), ["generate"]);
} catch (error) {
  console.error(
    "Prisma generate failed.",
    error instanceof Error ? error.message : error,
  );
}

await import("./index.js");

try {
  if (useEmbedded) {
    console.log("Starting the bundled database.");
    await startEmbedded(embedded);
  }

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
  runNode(packageFile("tsx", "dist/cli.mjs"), ["prisma/publishHouse.ts"]);
  delete process.env.PERIS_DATABASE_ERROR;
} catch (error) {
  const message = error instanceof Error ? error.message : "The database did not start.";
  process.env.PERIS_DATABASE_ERROR = message.slice(0, 300);
  console.error("PERIS database setup failed. The API is still listening.", message);
}
}
