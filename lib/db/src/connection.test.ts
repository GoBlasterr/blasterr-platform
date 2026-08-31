import assert from "node:assert/strict";
import test from "node:test";
import { getSupabaseDatabaseUrl, validateSupabaseDatabaseUrl } from "./connection";

test("accepts a PostgreSQL Supabase pooler URL", () => {
  const url = "postgresql://user:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
  assert.equal(validateSupabaseDatabaseUrl(url), url);
});

test("requires SUPABASE_DATABASE_URL and never falls back to DATABASE_URL", () => {
  assert.throws(
    () => getSupabaseDatabaseUrl({ DATABASE_URL: "postgresql://ignored@localhost/db" }),
    /SUPABASE_DATABASE_URL is required/,
  );
});

test("rejects non-PostgreSQL and direct Supabase URLs", () => {
  assert.throws(() => validateSupabaseDatabaseUrl("https://example.com"), /postgres/);
  assert.throws(
    () => validateSupabaseDatabaseUrl("postgresql://user:password@db.project.supabase.co/postgres"),
    /pooler host/,
  );
});