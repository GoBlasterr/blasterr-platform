import app from "./app";
import { logger } from "./lib/logger";
import { seedPreloadedSubjects } from "./lib/preloaded-seed";
import { validateDatabaseConnection } from "@workspace/db";
import { getSupabaseDatabaseUrl } from "@workspace/db";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripe-client";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  await validateDatabaseConnection();
  try {
    const stripeDatabaseUrl = getSupabaseDatabaseUrl();
    await runMigrations({ databaseUrl: stripeDatabaseUrl });
    const stripeSync = await getStripeSync();
    const webhookDomain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.env.REPLIT_DEV_DOMAIN;
    if (webhookDomain) {
      await stripeSync.findOrCreateManagedWebhook(`https://${webhookDomain}/api/stripe/webhook`);
    }
    void stripeSync.syncBackfill().catch((error) => {
      logger.warn({ err: error }, "Stripe backfill did not complete");
    });
  } catch (error) {
    logger.warn({ err: error }, "Stripe sync initialization deferred until the connected runtime is available");
  }
  const preloadSeed = await seedPreloadedSubjects();
  logger.info({ preloadSeed }, "Canonical preloaded Targets synchronized");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, "API startup failed because Supabase is unavailable");
  process.exit(1);
});
