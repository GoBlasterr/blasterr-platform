import { URL } from "node:url";

export const SUPABASE_DATABASE_URL_ENV = "SUPABASE_DATABASE_URL";

/**
 * Returns a validated Supabase connection URL without ever including it in an
 * error message. Supabase direct database hosts are deliberately rejected:
 * their IPv6-only address can be unreachable from common serverless runtimes.
 */
export function validateSupabaseDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${SUPABASE_DATABASE_URL_ENV} is required. Set it to your Supabase IPv4-compatible pooler connection string.`,
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${SUPABASE_DATABASE_URL_ENV} must be a valid PostgreSQL connection URL.`,
    );
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(
      `${SUPABASE_DATABASE_URL_ENV} must use the postgres:// or postgresql:// protocol.`,
    );
  }

  if (!url.hostname) {
    throw new Error(`${SUPABASE_DATABASE_URL_ENV} must include a database host.`);
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname.endsWith(".supabase.co") && !hostname.endsWith(".pooler.supabase.com")) {
    throw new Error(
      `${SUPABASE_DATABASE_URL_ENV} must use a Supabase pooler host (*.pooler.supabase.com), not a direct database host. Use the IPv4-compatible pooler URL from Supabase Connect.`,
    );
  }

  return value;
}

export function getSupabaseDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return validateSupabaseDatabaseUrl(env[SUPABASE_DATABASE_URL_ENV]);
}