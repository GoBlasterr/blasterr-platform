import { defineConfig } from "drizzle-kit";
import path from "path";

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

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
