import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";
import { getSupabaseDatabaseUrl } from "@workspace/db";

type StripeConnectionSettings = {
  secret_key?: string;
  webhook_secret?: string;
};

async function getStripeConnectionSettings(): Promise<StripeConnectionSettings> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const replitToken = process.env.REPLIT_IDENTITY
    ? `repl ${process.env.REPLIT_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !replitToken) {
    throw new Error("Stripe integration is not available in this runtime.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: replitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Stripe connection lookup failed with status ${response.status}.`);
  }

  const payload = await response.json() as { items?: Array<{ settings?: StripeConnectionSettings }> };
  const settings = payload.items?.[0]?.settings;
  if (!settings?.secret_key) {
    throw new Error("Stripe is connected but does not provide a secret key.");
  }
  return settings;
}

export async function getStripeClient(): Promise<Stripe> {
  const settings = await getStripeConnectionSettings();
  return new Stripe(settings.secret_key!);
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const configured = process.env.STRIPE_WEBHOOK_SECRET;
  if (configured) return configured;
  try {
    const settings = await getStripeConnectionSettings();
    return settings.webhook_secret ?? null;
  } catch {
    return null;
  }
}

export async function getStripeSync(): Promise<StripeSync> {
  const settings = await getStripeConnectionSettings();
  return new StripeSync({
    poolConfig: { connectionString: getSupabaseDatabaseUrl() },
    stripeSecretKey: settings.secret_key!,
    stripeWebhookSecret: settings.webhook_secret ?? process.env.STRIPE_WEBHOOK_SECRET ?? "",
  });
}