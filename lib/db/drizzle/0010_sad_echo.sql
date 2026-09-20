-- Business Pro is additive to the existing Business Target tables created by
-- 0009_business_ecosystem. Keep this migration safe to replay against those
-- already-provisioned tables.
CREATE TABLE IF NOT EXISTS "business_pro_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "target_id" text NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "owner_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "provider" text NOT NULL DEFAULT 'stripe',
  "provider_customer_id" text NOT NULL,
  "provider_subscription_id" text NOT NULL,
  "plan_id" text NOT NULL DEFAULT 'business_pro_monthly',
  "status" text NOT NULL DEFAULT 'incomplete',
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "canceled_at" timestamptz,
  "suspended_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_pro_subscriptions_provider_check" CHECK ("provider" IN ('stripe')),
  CONSTRAINT "business_pro_subscriptions_status_check" CHECK ("status" IN ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete_expired', 'paused', 'expired'))
);
CREATE TABLE IF NOT EXISTS "business_pro_subscription_events" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL DEFAULT 'stripe',
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "subscription_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "business_pro_subscriptions_target_unique" ON "business_pro_subscriptions" ("target_id");
CREATE UNIQUE INDEX IF NOT EXISTS "business_pro_subscriptions_provider_subscription_unique" ON "business_pro_subscriptions" ("provider", "provider_subscription_id");
CREATE INDEX IF NOT EXISTS "business_pro_subscriptions_status_idx" ON "business_pro_subscriptions" ("status", "updated_at");
CREATE INDEX IF NOT EXISTS "business_pro_subscriptions_owner_idx" ON "business_pro_subscriptions" ("owner_user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "business_pro_subscription_events_provider_event_unique" ON "business_pro_subscription_events" ("provider", "provider_event_id");
CREATE INDEX IF NOT EXISTS "business_pro_subscription_events_subscription_idx" ON "business_pro_subscription_events" ("subscription_id", "created_at");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_memberships_role_check') THEN
    ALTER TABLE "business_memberships" DROP CONSTRAINT "business_memberships_role_check";
  END IF;
  ALTER TABLE "business_memberships"
    ADD CONSTRAINT "business_memberships_role_check"
    CHECK ("role" IN ('owner', 'manager', 'response_only', 'analytics_only', 'analyst'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;