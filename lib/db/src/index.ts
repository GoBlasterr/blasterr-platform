import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;
const useSupabaseDatabase = process.env.USE_SUPABASE_DATABASE === "true";
const databaseUrl =
  useSupabaseDatabase &&
  supabaseDatabaseUrl &&
  /^postgres(?:ql)?:\/\//i.test(supabaseDatabaseUrl)
    ? supabaseDatabaseUrl
    : process.env.DATABASE_URL;

if (useSupabaseDatabase && !databaseUrl) {
  throw new Error(
    "USE_SUPABASE_DATABASE=true requires a valid SUPABASE_DATABASE_URL.",
  );
}

if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to configure a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
