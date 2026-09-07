CREATE TABLE "target_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"target_id" text NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "is_canonical" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "is_preloaded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "preload_category" text;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "preload_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "canonical_key" text;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "provenance" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "created_by_admin_id" text;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "target_aliases" ADD CONSTRAINT "target_aliases_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "target_aliases_normalized_unique" ON "target_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "target_aliases_target_normalized_unique" ON "target_aliases" USING btree ("target_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "target_aliases_target_idx" ON "target_aliases" USING btree ("target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_canonical_key_unique" ON "targets" USING btree ("canonical_key");--> statement-breakpoint
CREATE INDEX "targets_preloaded_discovery_idx" ON "targets" USING btree ("is_preloaded","preload_status","featured","created_at");--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_preload_status_check" CHECK ("targets"."preload_status" in ('active', 'disabled', 'archived'));--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_canonical_preloaded_check" CHECK (not "targets"."is_canonical" or "targets"."is_preloaded");