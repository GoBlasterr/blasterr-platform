ALTER TABLE "blasts" DROP CONSTRAINT "blasts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blasts" DROP CONSTRAINT "blasts_target_id_targets_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_blocker_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_blocked_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_blast_id_blasts_id_fk";
--> statement-breakpoint
ALTER TABLE "clip_analytics" DROP CONSTRAINT "clip_analytics_clip_id_clips_id_fk";
--> statement-breakpoint
ALTER TABLE "clip_assets" DROP CONSTRAINT "clip_assets_clip_id_clips_id_fk";
--> statement-breakpoint
ALTER TABLE "clip_distribution" DROP CONSTRAINT "clip_distribution_clip_id_clips_id_fk";
--> statement-breakpoint
ALTER TABLE "clip_settings" DROP CONSTRAINT "clip_settings_clip_id_clips_id_fk";
--> statement-breakpoint
ALTER TABLE "clips" DROP CONSTRAINT "clips_blast_id_blasts_id_fk";
--> statement-breakpoint
ALTER TABLE "clips" DROP CONSTRAINT "clips_creator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_blast_id_blasts_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "content_permissions" DROP CONSTRAINT "content_permissions_blast_id_blasts_id_fk";
--> statement-breakpoint
ALTER TABLE "follows" DROP CONSTRAINT "follows_follower_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "follows" DROP CONSTRAINT "follows_following_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_blast_id_blasts_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_approval_records" DROP CONSTRAINT "ad_approval_records_advertisement_id_advertisements_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_billing_profiles" DROP CONSTRAINT "ad_billing_profiles_advertiser_id_advertisers_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_events" DROP CONSTRAINT "ad_events_advertisement_id_advertisements_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" DROP CONSTRAINT "ad_fraud_flags_event_id_ad_events_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" DROP CONSTRAINT "ad_fraud_flags_advertisement_id_advertisements_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_groups" DROP CONSTRAINT "ad_groups_campaign_id_ad_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" DROP CONSTRAINT "ad_promotion_requests_advertiser_id_advertisers_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" DROP CONSTRAINT "ad_promotion_requests_campaign_id_ad_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_refunds" DROP CONSTRAINT "ad_refunds_transaction_id_ad_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_reports" DROP CONSTRAINT "ad_reports_campaign_id_ad_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" DROP CONSTRAINT "ad_spend_ledger_campaign_id_ad_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" DROP CONSTRAINT "ad_spend_ledger_advertisement_id_advertisements_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" DROP CONSTRAINT "ad_spend_ledger_event_id_ad_events_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_transactions" DROP CONSTRAINT "ad_transactions_advertiser_id_advertisers_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_transactions" DROP CONSTRAINT "ad_transactions_campaign_id_ad_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "advertisements" DROP CONSTRAINT "advertisements_campaign_id_ad_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "advertisements" DROP CONSTRAINT "advertisements_ad_group_id_ad_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "advertisements" DROP CONSTRAINT "advertisements_creative_id_ad_creatives_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_campaigns" DROP CONSTRAINT "ad_campaigns_advertiser_id_advertisers_id_fk";
--> statement-breakpoint
ALTER TABLE "ad_creatives" DROP CONSTRAINT "ad_creatives_advertiser_id_advertisers_id_fk";
--> statement-breakpoint
ALTER TABLE "clip_assets" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "clip_distribution" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "music_assets" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "music_assets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_original_blast_id_blasts_id_fk" FOREIGN KEY ("original_blast_id") REFERENCES "public"."blasts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_analytics" ADD CONSTRAINT "clip_analytics_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_assets" ADD CONSTRAINT "clip_assets_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_distribution" ADD CONSTRAINT "clip_distribution_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_settings" ADD CONSTRAINT "clip_settings_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_permissions" ADD CONSTRAINT "content_permissions_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_blast_id_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."blasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_approval_records" ADD CONSTRAINT "ad_approval_records_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_billing_profiles" ADD CONSTRAINT "ad_billing_profiles_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD CONSTRAINT "ad_fraud_flags_event_id_ad_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ad_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_fraud_flags" ADD CONSTRAINT "ad_fraud_flags_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" ADD CONSTRAINT "ad_promotion_requests_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" ADD CONSTRAINT "ad_promotion_requests_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_refunds" ADD CONSTRAINT "ad_refunds_transaction_id_ad_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ad_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_event_id_ad_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."ad_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_transactions" ADD CONSTRAINT "ad_transactions_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_transactions" ADD CONSTRAINT "ad_transactions_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blasts_visibility_created_idx" ON "blasts" USING btree ("visibility","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clip_assets_clip_order_unique" ON "clip_assets" USING btree ("clip_id","asset_order");--> statement-breakpoint
CREATE UNIQUE INDEX "clip_distribution_platform_unique" ON "clip_distribution" USING btree ("clip_id","platform");--> statement-breakpoint
CREATE INDEX "comments_blast_created_idx" ON "comments" USING btree ("blast_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "follows_following_created_idx" ON "follows" USING btree ("following_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_normalized_identity_unique" ON "targets" USING btree ("type","name","location");--> statement-breakpoint
CREATE INDEX "users_status_created_idx" ON "users" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_visibility_check" CHECK ("blasts"."visibility" in ('public', 'followers', 'private'));--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_status_check" CHECK ("blasts"."status" in ('active', 'hidden', 'deleted'));--> statement-breakpoint
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_counts_nonnegative" CHECK ("blasts"."view_count" >= 0 and "blasts"."share_count" >= 0);--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_no_self_block" CHECK ("blocks"."blocker_id" <> "blocks"."blocked_id");--> statement-breakpoint
ALTER TABLE "clip_analytics" ADD CONSTRAINT "clip_analytics_counts_nonnegative" CHECK ("clip_analytics"."views" >= 0 and "clip_analytics"."likes" >= 0 and "clip_analytics"."comments" >= 0 and "clip_analytics"."shares" >= 0 and "clip_analytics"."clicks" >= 0);--> statement-breakpoint
ALTER TABLE "clip_assets" ADD CONSTRAINT "clip_assets_order_nonnegative" CHECK ("clip_assets"."asset_order" >= 0);--> statement-breakpoint
ALTER TABLE "clip_assets" ADD CONSTRAINT "clip_assets_duration_positive" CHECK ("clip_assets"."duration" is null or "clip_assets"."duration" > 0);--> statement-breakpoint
ALTER TABLE "clip_distribution" ADD CONSTRAINT "clip_distribution_status_check" CHECK ("clip_distribution"."status" in ('NOT_CONNECTED', 'PENDING', 'PUBLISHED', 'FAILED'));--> statement-breakpoint
ALTER TABLE "clip_settings" ADD CONSTRAINT "clip_settings_duration_positive" CHECK ("clip_settings"."duration" > 0);--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_duration_positive" CHECK ("clips"."duration" > 0);--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_render_status_check" CHECK ("clips"."render_status" in ('DRAFT', 'QUEUED', 'RENDERING', 'COMPLETED', 'FAILED'));--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_no_self_follow" CHECK ("follows"."follower_id" <> "follows"."following_id");--> statement-breakpoint
ALTER TABLE "music_assets" ADD CONSTRAINT "music_assets_duration_nonnegative" CHECK ("music_assets"."duration" >= 0);--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_type_check" CHECK ("reactions"."reaction_type" in ('like', 'love', 'laugh', 'angry', 'sad'));--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_type_check" CHECK ("reports"."target_type" in ('user', 'blast', 'comment', 'target'));--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('open', 'reviewing', 'resolved', 'dismissed'));--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_type_check" CHECK ("targets"."type" in ('person', 'place', 'organization', 'event', 'other'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'suspended', 'deleted'));--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_frequency_cap_positive" CHECK ("ad_groups"."frequency_cap" is null or "ad_groups"."frequency_cap" > 0);--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" ADD CONSTRAINT "ad_promotion_requests_budget_nonnegative" CHECK ("ad_promotion_requests"."budget" is null or "ad_promotion_requests"."budget" >= 0);--> statement-breakpoint
ALTER TABLE "ad_promotion_requests" ADD CONSTRAINT "ad_promotion_requests_schedule_check" CHECK ("ad_promotion_requests"."ends_at" is null or "ad_promotion_requests"."starts_at" is null or "ad_promotion_requests"."ends_at" >= "ad_promotion_requests"."starts_at");--> statement-breakpoint
ALTER TABLE "ad_refunds" ADD CONSTRAINT "ad_refunds_amount_nonnegative" CHECK ("ad_refunds"."amount_minor" >= 0);--> statement-breakpoint
ALTER TABLE "ad_spend_ledger" ADD CONSTRAINT "ad_spend_ledger_amounts_nonnegative" CHECK ("ad_spend_ledger"."bid_amount" >= 0 and "ad_spend_ledger"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "ad_transactions" ADD CONSTRAINT "ad_transactions_amounts_nonnegative" CHECK ("ad_transactions"."amount_minor" >= 0 and "ad_transactions"."refunded_amount_minor" >= 0 and "ad_transactions"."refunded_amount_minor" <= "ad_transactions"."amount_minor");--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_frequency_cap_positive" CHECK ("advertisements"."frequency_cap" is null or "advertisements"."frequency_cap" > 0);--> statement-breakpoint
ALTER TABLE "advertisers" ADD CONSTRAINT "advertisers_status_check" CHECK ("advertisers"."status" in ('active', 'suspended', 'closed'));--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_status_check" CHECK ("ad_campaigns"."status" in ('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected'));--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_pricing_check" CHECK ("ad_campaigns"."pricing_model" in ('cpm', 'cpc', 'cpa'));--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_amounts_nonnegative" CHECK (("ad_campaigns"."daily_budget" is null or "ad_campaigns"."daily_budget" >= 0) and ("ad_campaigns"."total_budget" is null or "ad_campaigns"."total_budget" >= 0) and ("ad_campaigns"."bid_amount" is null or "ad_campaigns"."bid_amount" >= 0) and "ad_campaigns"."spent_amount" >= 0);--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_schedule_check" CHECK ("ad_campaigns"."ends_at" is null or "ad_campaigns"."starts_at" is null or "ad_campaigns"."ends_at" >= "ad_campaigns"."starts_at");--> statement-breakpoint
ALTER TABLE "admin_announcements" ADD CONSTRAINT "admin_announcements_status_check" CHECK ("admin_announcements"."status" in ('draft', 'scheduled', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "admin_announcements" ADD CONSTRAINT "admin_announcements_audience_check" CHECK ("admin_announcements"."audience" in ('all', 'users', 'advertisers', 'admins'));--> statement-breakpoint
ALTER TABLE "admin_reports" ADD CONSTRAINT "admin_reports_status_check" CHECK ("admin_reports"."status" in ('open', 'reviewing', 'resolved', 'dismissed'));--> statement-breakpoint
ALTER TABLE "admin_reports" ADD CONSTRAINT "admin_reports_target_type_check" CHECK ("admin_reports"."target_type" in ('user', 'blast', 'comment', 'target'));