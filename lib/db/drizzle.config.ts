import { defineConfig } from "drizzle-kit";
import path from "path";
import { getSupabaseDatabaseUrl } from "./src/connection";

const useSupabaseDatabase = process.env.USE_SUPABASE_DATABASE === "true";
const databaseUrl = useSupabaseDatabase
  ? getSupabaseDatabaseUrl()
  : process.env.DATABASE_URL ?? getSupabaseDatabaseUrl();

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
