ALTER TABLE "clips" DROP CONSTRAINT "clips_render_status_check";--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_type_check";--> statement-breakpoint
ALTER TABLE "targets" DROP CONSTRAINT "targets_type_check";--> statement-breakpoint
DROP INDEX "targets_normalized_identity_unique";--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "normalized_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "normalized_location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "longitude" double precision;--> statement-breakpoint
UPDATE "targets"
SET
  "normalized_name" = lower(regexp_replace(trim("name"), '[^[:alnum:]]+', ' ', 'g')),
  "normalized_location" = lower(regexp_replace(trim("location"), '[^[:alnum:]]+', ' ', 'g'));--> statement-breakpoint
CREATE INDEX "targets_coordinates_idx" ON "targets" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_normalized_identity_unique" ON "targets" USING btree ("type","normalized_name","normalized_location");--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_render_status_check" CHECK ("clips"."render_status" in ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SHARED'));--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_type_check" CHECK ("reactions"."reaction_type" in ('blast', 'facts', 'cap', 'funny', 'watching'));--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_latitude_check" CHECK ("targets"."latitude" is null or "targets"."latitude" between -90 and 90);--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_longitude_check" CHECK ("targets"."longitude" is null or "targets"."longitude" between -180 and 180);--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_coordinates_pair_check" CHECK (("targets"."latitude" is null) = ("targets"."longitude" is null));--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_type_check" CHECK ("targets"."type" in ('person', 'business', 'place', 'product', 'entertainment', 'sports', 'gaming', 'other'));