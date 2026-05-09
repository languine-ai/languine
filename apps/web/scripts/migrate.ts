/**
 * Programmatic drizzle migration runner.
 *
 * Runs SQL migrations from ./drizzle against `DATABASE_URL`. Used as part of
 * `bun run build` so that a fresh Vercel deployment automatically applies the
 * schema on first boot.
 *
 * Safe to run repeatedly (drizzle tracks applied migrations in its own meta
 * table), and a no-op when `DATABASE_URL` is not set (e.g. CI typecheck).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("[languine] DATABASE_URL is not set; skipping migrations.");
  process.exit(0);
}

if (process.env.SKIP_MIGRATIONS === "1") {
  console.log("[languine] SKIP_MIGRATIONS=1; skipping migrations.");
  process.exit(0);
}

async function main() {
  const sql = neon(url!);
  const db = drizzle(sql);

  console.log("[languine] Applying migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[languine] Migrations applied.");
}

main().catch((error) => {
  console.error("[languine] Migration failed:", error);
  process.exit(1);
});
