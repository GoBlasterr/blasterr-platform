import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getSupabaseDatabaseUrl } from "./connection.ts";
import * as schema from "./schema/index.ts";

const { Pool } = pg;

const databaseUrl = getSupabaseDatabaseUrl();

export const pool = new Pool({
  connectionString: databaseUrl,
  // Keep application connection counts well below the Supabase pooler's limit.
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});
export const db = drizzle(pool, { schema });

/**
 * Verifies that the configured Supabase pooler is reachable without exposing
 * connection details or credentials in failures.
 */
export async function validateDatabaseConnection(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch {
    throw new Error(
      "Unable to connect to Supabase. Verify SUPABASE_DATABASE_URL is the active pooler connection string and that network access is allowed.",
    );
  }
}
export {
  getSupabaseDatabaseUrl,
  SUPABASE_DATABASE_URL_ENV,
  validateSupabaseDatabaseUrl,
} from "./connection.ts";
export * from "./schema/index.ts";
