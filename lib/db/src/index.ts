import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;
const databaseUrl =
  supabaseDatabaseUrl &&
  /^postgres(?:ql)?:\/\//i.test(supabaseDatabaseUrl)
    ? supabaseDatabaseUrl
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to configure a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
