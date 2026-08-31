import { defineConfig } from "drizzle-kit";
import path from "path";
import { getSupabaseDatabaseUrl } from "./src/connection";

const databaseUrl = getSupabaseDatabaseUrl();

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
