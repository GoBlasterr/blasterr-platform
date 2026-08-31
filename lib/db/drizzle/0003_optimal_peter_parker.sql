CREATE TABLE "ad_fraud_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"fraud_flag_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_clerk_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_fraud_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"fraud_flag_id" text,
	"admin_clerk_id" text,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"provider" text DEFAULT 'cloudflare-r2' NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"purpose" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"lifecycle_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_size_positive" CHECK ("media_assets"."size_bytes" > 0),
	CONSTRAINT "media_assets_visibility_check" CHECK ("media_assets"."visibility" in ('public', 'private')),
	CONSTRAINT "media_assets_lifecycle_status_check" CHECK ("media_assets"."lifecycle_status" in ('pending', 'ready', 'failed', 'deleted'))
);
--> statement-breakpoint
ALTER TABLE "admin_reports" DROP CONSTRAINT "admin_reports_status_check";--> statement-breakpoint
ALTER TABLE "ad_events" ADD COLUMN "trust_status" text DEFAULT 'trusted' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_events" ADD COLUMN "source_hash" text;--> statement-breakpoint
ALTER TABLE "ad_events" ADD COLUMN "destination_url" text;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD COLUMN "severity" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD COLUMN "reviewer_clerk_id" text;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "ad_fraud_audit_logs" ADD CONSTRAINT "ad_fraud_audit_logs_fraud_flag_id_ad_fraud_flags_id_fk" FOREIGN KEY ("fraud_flag_id") REFERENCES "public"."ad_fraud_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_fraud_notifications" ADD CONSTRAINT "ad_fraud_notifications_fraud_flag_id_ad_fraud_flags_id_fk" FOREIGN KEY ("fraud_flag_id") REFERENCES "public"."ad_fraud_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_fraud_audit_flag_created_idx" ON "ad_fraud_audit_logs" USING btree ("fraud_flag_id","created_at");--> statement-breakpoint
CREATE INDEX "ad_fraud_notifications_admin_read_idx" ON "ad_fraud_notifications" USING btree ("admin_clerk_id","read","created_at");--> statement-breakpoint
CREATE INDEX "ad_fraud_notifications_flag_idx" ON "ad_fraud_notifications" USING btree ("fraud_flag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_provider_object_unique" ON "media_assets" USING btree ("provider","bucket","object_key");--> statement-breakpoint
CREATE INDEX "media_assets_owner_created_idx" ON "media_assets" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_purpose_status_idx" ON "media_assets" USING btree ("purpose","lifecycle_status");--> statement-breakpoint
CREATE INDEX "media_assets_resource_idx" ON "media_assets" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "ad_events_trust_occurred_idx" ON "ad_events" USING btree ("trust_status","occurred_at");--> statement-breakpoint
CREATE INDEX "ad_events_source_occurred_idx" ON "ad_events" USING btree ("source_hash","occurred_at");--> statement-breakpoint
CREATE INDEX "ad_fraud_flags_status_severity_idx" ON "ad_fraud_flags" USING btree ("status","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_reports_campaign_date_unique" ON "ad_reports" USING btree ("campaign_id","report_date");--> statement-breakpoint
ALTER TABLE "admin_reports" ADD CONSTRAINT "admin_reports_status_check" CHECK ("admin_reports"."status" in ('open', 'in_review', 'resolved', 'dismissed'));