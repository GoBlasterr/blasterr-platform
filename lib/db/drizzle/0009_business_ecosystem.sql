ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "verified" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "business_profiles" (
  "target_id" text PRIMARY KEY REFERENCES "targets"("id") ON DELETE CASCADE,
  "category" text NOT NULL DEFAULT 'other',
  "subcategory" text NOT NULL DEFAULT '',
  "address" text NOT NULL DEFAULT '',
  "city" text NOT NULL DEFAULT '',
  "state" text NOT NULL DEFAULT '',
  "postal_code" text NOT NULL DEFAULT '',
  "phone" text NOT NULL DEFAULT '',
  "website" text NOT NULL DEFAULT '',
  "email" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'active',
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_profiles_status_check" CHECK ("status" IN ('active', 'hidden', 'locked')),
  CONSTRAINT "business_profiles_verification_check" CHECK ("verification_status" IN ('unverified', 'pending', 'verified'))
);
CREATE INDEX IF NOT EXISTS "business_profiles_category_idx" ON "business_profiles" ("category");
CREATE INDEX IF NOT EXISTS "business_profiles_location_idx" ON "business_profiles" ("city", "state");
CREATE INDEX IF NOT EXISTS "business_profiles_status_idx" ON "business_profiles" ("status", "verification_status");

CREATE TABLE IF NOT EXISTS "business_claims" (
  "id" text PRIMARY KEY,
  "target_id" text NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "applicant_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "verification_method" text NOT NULL,
  "evidence" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "reviewer_id" text,
  "review_note" text NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_claims_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'more_info'))
);
CREATE INDEX IF NOT EXISTS "business_claims_target_status_idx" ON "business_claims" ("target_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "business_claims_applicant_idx" ON "business_claims" ("applicant_id", "created_at");

CREATE TABLE IF NOT EXISTS "business_memberships" (
  "target_id" text NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'owner',
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("target_id", "user_id"),
  CONSTRAINT "business_memberships_role_check" CHECK ("role" IN ('owner', 'manager', 'analyst')),
  CONSTRAINT "business_memberships_status_check" CHECK ("status" IN ('active', 'revoked'))
);
CREATE INDEX IF NOT EXISTS "business_memberships_user_idx" ON "business_memberships" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "business_memberships_target_idx" ON "business_memberships" ("target_id", "status");

CREATE TABLE IF NOT EXISTS "business_follows" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_id" text NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "target_id")
);
CREATE INDEX IF NOT EXISTS "business_follows_target_created_idx" ON "business_follows" ("target_id", "created_at");
CREATE INDEX IF NOT EXISTS "business_follows_user_idx" ON "business_follows" ("user_id", "created_at");