ALTER TABLE "advertisements" ADD COLUMN IF NOT EXISTS "home_feed_height" text;--> statement-breakpoint
UPDATE "advertisements" SET "home_feed_height" = 'medium' WHERE "home_feed_height" IS NULL;--> statement-breakpoint
ALTER TABLE "advertisements" ALTER COLUMN "home_feed_height" SET DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "advertisements" ALTER COLUMN "home_feed_height" SET NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'advertisements_home_feed_height_check'
      AND conrelid = 'public.advertisements'::regclass
  ) THEN
    ALTER TABLE "advertisements"
      ADD CONSTRAINT "advertisements_home_feed_height_check"
      CHECK ("home_feed_height" IN ('small', 'medium', 'large'));
  END IF;
END
$$;