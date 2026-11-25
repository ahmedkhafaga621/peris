import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import { loadEnv } from "./loadEnv.js";

loadEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 5433;
const user = "peris";
const password = "peris";
const database = "peris";
const databaseDir = path.join(root, "data", "pg");

process.env.DATABASE_URL ??= `postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`;
process.env.JWT_ACCESS_SECRET ??= "local-dev-access-secret-change-before-production";
process.env.ADMIN_EMAIL ??= "admin@peris.ae";
process.env.ADMIN_PASSWORD ??= "change-this-password";
process.env.PORT ??= "4000";

const postgres = new EmbeddedPostgres({
  databaseDir,
  user,
  password,
  port,
  persistent: true,
});

const alreadyInitialised = existsSync(path.join(databaseDir, "PG_VERSION"));
if (!alreadyInitialised) {
  await postgres.initialise();
}
await postgres.start();
try {
  await postgres.createDatabase(database);
} catch {
  // The database already exists on later runs.
}

const migrationsDir = path.join(root, "prisma", "migrations");
const migrate = existsSync(migrationsDir)
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name init --skip-seed";
execSync(migrate, { cwd: root, stdio: "inherit", env: process.env });
execSync("npx tsx prisma/seed.ts", { cwd: root, stdio: "inherit", env: process.env });

await import("./index.js");
