CREATE TABLE "blasts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"original_blast_id" text,
	"content" text NOT NULL,
	"media_url" text DEFAULT '' NOT NULL,
	"media_type" text,
	"location" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"allow_clip_creation" boolean DEFAULT true NOT NULL,
	"allow_external_sharing" boolean DEFAULT false NOT NULL,
	"allow_promotional_use" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" text NOT NULL,
	"blast_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_blast_id_pk" PRIMARY KEY("user_id","blast_id")
);
--> statement-breakpoint
CREATE TABLE "clip_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"platform" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clip_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"asset_type" text NOT NULL,
	"asset_url" text NOT NULL,
	"asset_order" integer DEFAULT 0 NOT NULL,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "clip_distribution" (
	"id" text PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'NOT_CONNECTED' NOT NULL,
	"external_post_id" text,
	"published_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "clip_settings" (
	"clip_id" text PRIMARY KEY NOT NULL,
	"caption_style" text DEFAULT 'bold' NOT NULL,
	"caption_position" text DEFAULT 'center' NOT NULL,
	"caption_animation" text DEFAULT 'pop' NOT NULL,
	"branding_style" text DEFAULT 'full' NOT NULL,
	"music_id" text,
	"voiceover_enabled" boolean DEFAULT false NOT NULL,
	"cta_text" text DEFAULT 'See the full Blast on BLASTERR' NOT NULL,
	"background" text DEFAULT 'cosmic' NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clips" (
	"id" text PRIMARY KEY NOT NULL,
	"blast_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"style" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"aspect_ratio" text DEFAULT '9:16' NOT NULL,
	"render_status" text DEFAULT 'DRAFT' NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"blast_id" text NOT NULL,
	"user_id" text NOT NULL,
	"parent_comment_id" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_permissions" (
	"blast_id" text PRIMARY KEY NOT NULL,
	"allow_clip_creation" boolean DEFAULT true NOT NULL,
	"allow_external_sharing" boolean DEFAULT false NOT NULL,
	"allow_promotional_use" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "music_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT 'BLASTERR' NOT NULL,
	"license_type" text NOT NULL,
	"audio_url" text NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"type" text NOT NULL,
	"reference_id" text,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"blast_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reaction_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_blast_id_user_id_pk" PRIMARY KEY("blast_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"zip_code" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_approval_records" (
	"id" text PRIMARY KEY NOT NULL,
	"advertisement_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"reviewer_clerk_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'processed' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_billing_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"advertiser_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_events" (
	"id" text PRIMARY KEY NOT NULL,
	"advertisement_id" text NOT NULL,
	"event_type" text NOT NULL,
	"session_id" text,
	"delivery_token_id" text,
	"placement" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_fraud_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text,
	"advertisement_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reason" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"targeting" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"frequency_cap" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_promotion_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"advertiser_id" text NOT NULL,
	"campaign_id" text,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"budget" numeric(14, 2),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"reviewed_by_clerk_id" text,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_refund_id" text,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"requested_by_clerk_id" text,
	"authorization_confirmed_at" timestamp with time zone,
	"provider_created_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"report_date" timestamp with time zone NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_spend_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"advertisement_id" text NOT NULL,
	"event_id" text NOT NULL,
	"pricing_model" text NOT NULL,
	"billable_event" text NOT NULL,
	"bid_amount" numeric(14, 4) NOT NULL,
	"amount" numeric(14, 4) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"advertiser_id" text,
	"campaign_id" text,
	"provider" text NOT NULL,
	"provider_transaction_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"status" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"refunded_amount_minor" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"invoice_url" text,
	"provider_created_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertisements" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"ad_group_id" text,
	"creative_id" text,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"placement" text NOT NULL,
	"headline" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"media_url" text,
	"destination_url" text,
	"targeting" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"frequency_cap" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertisers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_clerk_id" text,
	"contact_email" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertising_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_clerk_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertising_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"emergency_shutdown" boolean DEFAULT false NOT NULL,
	"placement_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"frequency_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"feature_flags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_clerk_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"advertiser_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"placements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"targeting" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"daily_budget" numeric(14, 2),
	"total_budget" numeric(14, 2),
	"pricing_model" text DEFAULT 'cpm' NOT NULL,
	"bid_amount" numeric(14, 4),
	"spent_amount" numeric(14, 4) DEFAULT '0' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_creatives" (
	"id" text PRIMARY KEY NOT NULL,
	"advertiser_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'image' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"media_url" text,
	"destination_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_content_statuses" (
	"content_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "admin_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"content_review_mode" boolean DEFAULT false NOT NULL,
	"support_email" text DEFAULT 'support@blasterr.social' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_analytics" ADD CONSTRAINT "clip_analytics_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_assets" ADD CONSTRAINT "clip_assets_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_distribution" ADD CONSTRAINT "clip_distribution_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_settings" ADD CONSTRAINT "clip_settings_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_permissions" ADD CONSTRAINT "content_permissions_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_approval_records" ADD CONSTRAINT "ad_approval_records_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_billing_profiles" ADD CONSTRAINT "ad_billing_profiles_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD CONSTRAINT "ad_fraud_flags_event_id_ad_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ad_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD CONSTRAINT "ad_fraud_flags_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" ADD CONSTRAINT "ad_promotion_requests_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" ADD CONSTRAINT "ad_promotion_requests_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_refunds" ADD CONSTRAINT "ad_refunds_transaction_id_ad_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ad_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_event_id_ad_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ad_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_transactions" ADD CONSTRAINT "ad_transactions_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_transactions" ADD CONSTRAINT "ad_transactions_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blasts_user_created_idx" ON "blasts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "blasts_target_created_idx" ON "blasts" USING btree ("target_id","created_at");--> statement-breakpoint
CREATE INDEX "clip_analytics_clip_recorded_idx" ON "clip_analytics" USING btree ("clip_id","recorded_at");--> statement-breakpoint
CREATE INDEX "clip_assets_clip_idx" ON "clip_assets" USING btree ("clip_id");--> statement-breakpoint
CREATE INDEX "clip_distribution_clip_idx" ON "clip_distribution" USING btree ("clip_id");--> statement-breakpoint
CREATE INDEX "clips_creator_created_idx" ON "clips" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE INDEX "clips_blast_idx" ON "clips" USING btree ("blast_id");--> statement-breakpoint
CREATE INDEX "clips_status_idx" ON "clips" USING btree ("render_status");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_slug_idx" ON "targets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "targets_type_idx" ON "targets" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ad_approval_records_ad_idx" ON "ad_approval_records" USING btree ("advertisement_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_billing_events_provider_id_unique" ON "ad_billing_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "ad_billing_events_received_idx" ON "ad_billing_events" USING btree ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_billing_profiles_advertiser_unique" ON "ad_billing_profiles" USING btree ("advertiser_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_billing_profiles_provider_customer_unique" ON "ad_billing_profiles" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE INDEX "ad_events_ad_occurred_idx" ON "ad_events" USING btree ("advertisement_id","occurred_at");--> statement-breakpoint
CREATE INDEX "ad_events_type_occurred_idx" ON "ad_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_events_delivery_event_unique" ON "ad_events" USING btree ("delivery_token_id","event_type");--> statement-breakpoint
CREATE INDEX "ad_fraud_flags_ad_status_idx" ON "ad_fraud_flags" USING btree ("advertisement_id","status");--> statement-breakpoint
CREATE INDEX "ad_groups_campaign_idx" ON "ad_groups" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_groups_status_idx" ON "ad_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_promotion_requests_advertiser_idx" ON "ad_promotion_requests" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "ad_promotion_requests_type_status_idx" ON "ad_promotion_requests" USING btree ("type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_refunds_provider_id_unique" ON "ad_refunds" USING btree ("provider","provider_refund_id");--> statement-breakpoint
CREATE INDEX "ad_refunds_transaction_idx" ON "ad_refunds" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ad_reports_campaign_date_idx" ON "ad_reports" USING btree ("campaign_id","report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_spend_ledger_event_unique" ON "ad_spend_ledger" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ad_spend_ledger_campaign_occurred_idx" ON "ad_spend_ledger" USING btree ("campaign_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_transactions_provider_id_unique" ON "ad_transactions" USING btree ("provider","provider_transaction_id");--> statement-breakpoint
CREATE INDEX "ad_transactions_advertiser_created_idx" ON "ad_transactions" USING btree ("advertiser_id","created_at");--> statement-breakpoint
CREATE INDEX "ad_transactions_status_created_idx" ON "ad_transactions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "advertisements_campaign_idx" ON "advertisements" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "advertisements_placement_status_idx" ON "advertisements" USING btree ("placement","status");--> statement-breakpoint
CREATE INDEX "advertisers_status_idx" ON "advertisers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "advertisers_owner_idx" ON "advertisers" USING btree ("owner_clerk_id");--> statement-breakpoint
CREATE INDEX "advertising_audit_created_idx" ON "advertising_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "advertising_audit_entity_idx" ON "advertising_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ad_campaigns_advertiser_idx" ON "ad_campaigns" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "ad_campaigns_status_schedule_idx" ON "ad_campaigns" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "ad_creatives_advertiser_idx" ON "ad_creatives" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "ad_creatives_status_idx" ON "ad_creatives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_announcements_status_idx" ON "admin_announcements" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "admin_audit_events_created_idx" ON "admin_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_events_entity_idx" ON "admin_audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "admin_audit_events_actor_idx" ON "admin_audit_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_reports_status_created_idx" ON "admin_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "admin_reports_target_idx" ON "admin_reports" USING btree ("target_type","target_id");