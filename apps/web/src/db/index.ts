import { neon } from "@neondatabase/serverless";
import { type NeonHttpDatabase, drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Schema = typeof schema;
type Db = NeonHttpDatabase<Schema>;

let _db: Db | null = null;

function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Connect a Neon database via the Vercel Marketplace, or set it locally.",
    );
  }
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

/**
 * Drizzle DB client. Backed by a lazy Proxy so importing this module is safe
 * during Next.js build / page data collection (which runs without
 * `DATABASE_URL`). The connection is only created on first actual use.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
}) as Db;

export type Database = Db;
