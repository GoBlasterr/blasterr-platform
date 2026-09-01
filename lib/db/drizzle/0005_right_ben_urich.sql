CREATE TABLE "ad_boost_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"blast_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"budget" numeric(14, 2),
	"placement" text DEFAULT 'home_feed' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"request_note" text DEFAULT '' NOT NULL,
	"reviewer_clerk_id" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_boost_requests_status_check" CHECK ("ad_boost_requests"."status" in ('pending_review', 'approved', 'paused', 'rejected')),
	CONSTRAINT "ad_boost_requests_budget_nonnegative" CHECK ("ad_boost_requests"."budget" is null or "ad_boost_requests"."budget" >= 0),
	CONSTRAINT "ad_boost_requests_schedule_check" CHECK ("ad_boost_requests"."ends_at" is null or "ad_boost_requests"."starts_at" is null or "ad_boost_requests"."ends_at" >= "ad_boost_requests"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "admin_appeals" (
	"id" text PRIMARY KEY NOT NULL,
	"appellant_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewer_clerk_id" text,
	"reviewer_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_appeals_status_check" CHECK ("admin_appeals"."status" in ('open', 'in_review', 'approved', 'rejected')),
	CONSTRAINT "admin_appeals_target_type_check" CHECK ("admin_appeals"."target_type" in ('user', 'blast', 'comment', 'target'))
);
--> statement-breakpoint
CREATE TABLE "admin_blocked_words" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"normalized_term" text NOT NULL,
	"action" text DEFAULT 'block' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_blocked_words_action_check" CHECK ("admin_blocked_words"."action" in ('block', 'flag')),
	CONSTRAINT "admin_blocked_words_status_check" CHECK ("admin_blocked_words"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_clerk_id" text,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_boost_requests" ADD CONSTRAINT "ad_boost_requests_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_boost_requests_status_created_idx" ON "ad_boost_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ad_boost_requests_blast_idx" ON "ad_boost_requests" USING btree ("blast_id");--> statement-breakpoint
CREATE INDEX "admin_appeals_status_created_idx" ON "admin_appeals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "admin_appeals_appellant_idx" ON "admin_appeals" USING btree ("appellant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_blocked_words_normalized_unique" ON "admin_blocked_words" USING btree ("normalized_term");--> statement-breakpoint
CREATE INDEX "admin_blocked_words_status_idx" ON "admin_blocked_words" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_notifications_recipient_read_created_idx" ON "admin_notifications" USING btree ("admin_clerk_id","read","created_at");