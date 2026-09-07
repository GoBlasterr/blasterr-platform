import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    authId: text("auth_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    bio: text("bio").notNull().default(""),
    avatarUrl: text("avatar_url").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    location: text("location").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    zipCode: text("zip_code").notNull().default(""),
    status: text("status").notNull().default("active"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_auth_id_idx").on(table.authId),
    uniqueIndex("users_username_idx").on(table.username),
    uniqueIndex("users_email_idx").on(table.email),
    index("users_status_created_idx").on(table.status, table.createdAt),
    check("users_status_check", sql`${table.status} in ('active', 'suspended', 'deleted')`),
  ],
);

export const targetsTable = pgTable(
  "targets",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    location: text("location").notNull().default(""),
    normalizedName: text("normalized_name").notNull().default(""),
    normalizedLocation: text("normalized_location").notNull().default(""),
    /** Curated subjects are still normal Targets; this is only their discovery layer. */
    isCanonical: boolean("is_canonical").notNull().default(false),
    isPreloaded: boolean("is_preloaded").notNull().default(false),
    preloadCategory: text("preload_category"),
    preloadStatus: text("preload_status").notNull().default("active"),
    featured: boolean("featured").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    canonicalKey: text("canonical_key"),
    provenance: text("provenance").notNull().default("user"),
    createdByAdminId: text("created_by_admin_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("targets_slug_idx").on(table.slug),
    uniqueIndex("targets_normalized_identity_unique").on(
      table.type,
      table.normalizedName,
      table.normalizedLocation,
    ),
    index("targets_type_idx").on(table.type),
    index("targets_coordinates_idx").on(table.latitude, table.longitude),
    uniqueIndex("targets_canonical_key_unique").on(table.canonicalKey),
    index("targets_preloaded_discovery_idx").on(table.isPreloaded, table.preloadStatus, table.featured, table.createdAt),
    check("targets_type_check", sql`${table.type} in ('person', 'business', 'place', 'product', 'entertainment', 'sports', 'gaming', 'other')`),
    check("targets_latitude_check", sql`${table.latitude} is null or ${table.latitude} between -90 and 90`),
    check("targets_longitude_check", sql`${table.longitude} is null or ${table.longitude} between -180 and 180`),
    check("targets_coordinates_pair_check", sql`(${table.latitude} is null) = (${table.longitude} is null)`),
    check("targets_preload_status_check", sql`${table.preloadStatus} in ('active', 'disabled', 'archived')`),
    check("targets_canonical_preloaded_check", sql`not ${table.isCanonical} or ${table.isPreloaded}`),
  ],
);

/** Persisted normalized aliases make canonical subject resolution deterministic. */
export const targetAliasesTable = pgTable(
  "target_aliases",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    targetId: text("target_id").notNull().references(() => targetsTable.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("target_aliases_normalized_unique").on(table.normalizedAlias),
    uniqueIndex("target_aliases_target_normalized_unique").on(table.targetId, table.normalizedAlias),
    index("target_aliases_target_idx").on(table.targetId),
  ],
);

export const blastsTable = pgTable(
  "blasts",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    targetId: text("target_id").notNull().references(() => targetsTable.id, { onDelete: "restrict" }),
    originalBlastId: text("original_blast_id").references((): AnyPgColumn => blastsTable.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    mediaUrl: text("media_url").notNull().default(""),
    mediaType: text("media_type"),
    location: text("location").notNull().default(""),
    visibility: text("visibility").notNull().default("public"),
    status: text("status").notNull().default("active"),
    allowClipCreation: boolean("allow_clip_creation").notNull().default(true),
    allowExternalSharing: boolean("allow_external_sharing").notNull().default(false),
    allowPromotionalUse: boolean("allow_promotional_use").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("blasts_user_created_idx").on(table.userId, table.createdAt),
    index("blasts_target_created_idx").on(table.targetId, table.createdAt),
    index("blasts_visibility_created_idx").on(table.visibility, table.createdAt),
    check("blasts_visibility_check", sql`${table.visibility} in ('public', 'followers', 'private')`),
    check("blasts_status_check", sql`${table.status} in ('active', 'hidden', 'deleted')`),
    check("blasts_counts_nonnegative", sql`${table.viewCount} >= 0 and ${table.shareCount} >= 0`),
  ],
);

export const clipsTable = pgTable(
  "clips",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    blastId: text("blast_id").notNull().references(() => blastsTable.id, { onDelete: "cascade" }),
    creatorId: text("creator_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    style: text("style").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    duration: integer("duration").notNull().default(30),
    aspectRatio: text("aspect_ratio").notNull().default("9:16"),
    renderStatus: text("render_status").notNull().default("DRAFT"),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("clips_creator_created_idx").on(table.creatorId, table.createdAt),
    index("clips_blast_idx").on(table.blastId),
    index("clips_status_idx").on(table.renderStatus),
    check("clips_duration_positive", sql`${table.duration} > 0`),
    check("clips_render_status_check", sql`${table.renderStatus} in ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SHARED')`),
  ],
);

export const clipAssetsTable = pgTable(
  "clip_assets",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    clipId: text("clip_id").notNull().references(() => clipsTable.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    assetUrl: text("asset_url").notNull(),
    assetOrder: integer("asset_order").notNull().default(0),
    duration: integer("duration"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("clip_assets_clip_idx").on(table.clipId), uniqueIndex("clip_assets_clip_order_unique").on(table.clipId, table.assetOrder), check("clip_assets_order_nonnegative", sql`${table.assetOrder} >= 0`), check("clip_assets_duration_positive", sql`${table.duration} is null or ${table.duration} > 0`)],
);

export const clipSettingsTable = pgTable("clip_settings", {
  clipId: text("clip_id").primaryKey().references(() => clipsTable.id, { onDelete: "cascade" }),
  captionStyle: text("caption_style").notNull().default("bold"),
  captionPosition: text("caption_position").notNull().default("center"),
  captionAnimation: text("caption_animation").notNull().default("pop"),
  brandingStyle: text("branding_style").notNull().default("full"),
  musicId: text("music_id"),
  voiceoverEnabled: boolean("voiceover_enabled").notNull().default(false),
  ctaText: text("cta_text").notNull().default("See the full Blast on BLASTERR"),
  background: text("background").notNull().default("cosmic"),
  duration: integer("duration").notNull().default(30),
}, (table) => [check("clip_settings_duration_positive", sql`${table.duration} > 0`)]);

export const clipDistributionTable = pgTable(
  "clip_distribution",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    clipId: text("clip_id").notNull().references(() => clipsTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    status: text("status").notNull().default("NOT_CONNECTED"),
    externalPostId: text("external_post_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("clip_distribution_clip_idx").on(table.clipId), uniqueIndex("clip_distribution_platform_unique").on(table.clipId, table.platform), check("clip_distribution_status_check", sql`${table.status} in ('NOT_CONNECTED', 'PENDING', 'PUBLISHED', 'FAILED')`)],
);

export const musicAssetsTable = pgTable("music_assets", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  title: text("title").notNull(),
  artist: text("artist").notNull().default("BLASTERR"),
  licenseType: text("license_type").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("music_assets_duration_nonnegative", sql`${table.duration} >= 0`)]);

export const clipAnalyticsTable = pgTable(
  "clip_analytics",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    clipId: text("clip_id").notNull().references(() => clipsTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    views: integer("views").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("clip_analytics_clip_recorded_idx").on(table.clipId, table.recordedAt), check("clip_analytics_counts_nonnegative", sql`${table.views} >= 0 and ${table.likes} >= 0 and ${table.comments} >= 0 and ${table.shares} >= 0 and ${table.clicks} >= 0`)],
);

export const contentPermissionsTable = pgTable("content_permissions", {
  blastId: text("blast_id").primaryKey().references(() => blastsTable.id, { onDelete: "cascade" }),
  allowClipCreation: boolean("allow_clip_creation").notNull().default(true),
  allowExternalSharing: boolean("allow_external_sharing").notNull().default(false),
  allowPromotionalUse: boolean("allow_promotional_use").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  blastId: text("blast_id").notNull().references(() => blastsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  parentCommentId: text("parent_comment_id").references((): AnyPgColumn => commentsTable.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("comments_blast_created_idx").on(table.blastId, table.createdAt), index("comments_parent_idx").on(table.parentCommentId)]);

export const reactionsTable = pgTable(
  "reactions",
  {
    blastId: text("blast_id").notNull().references(() => blastsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    reactionType: text("reaction_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blastId, table.userId] }), check("reactions_type_check", sql`${table.reactionType} in ('blast', 'facts', 'cap', 'funny', 'watching')`)],
);

export const followsTable = pgTable(
  "follows",
  {
    followerId: text("follower_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    followingId: text("following_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] }), index("follows_following_created_idx").on(table.followingId, table.createdAt), check("follows_no_self_follow", sql`${table.followerId} <> ${table.followingId}`)],
);

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    blastId: text("blast_id").notNull().references(() => blastsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.blastId] })],
);

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  referenceId: text("reference_id"),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notifications_user_read_created_idx").on(table.userId, table.read, table.createdAt)]);

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  reporterId: text("reporter_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("reports_status_created_idx").on(table.status, table.createdAt), check("reports_target_type_check", sql`${table.targetType} in ('user', 'blast', 'comment', 'target')`), check("reports_status_check", sql`${table.status} in ('open', 'reviewing', 'resolved', 'dismissed')`)]);

export const blocksTable = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] }), check("blocks_no_self_block", sql`${table.blockerId} <> ${table.blockedId}`)],
);

export const insertUserSchema = createInsertSchema(usersTable);
export const insertTargetSchema = createInsertSchema(targetsTable);
export const insertTargetAliasSchema = createInsertSchema(targetAliasesTable);
export const insertBlastSchema = createInsertSchema(blastsTable);
export const insertCommentSchema = createInsertSchema(commentsTable);
export const insertReportSchema = createInsertSchema(reportsTable);
export const insertClipSchema = createInsertSchema(clipsTable);

export type UserRow = typeof usersTable.$inferSelect;
export type TargetRow = typeof targetsTable.$inferSelect;
export type TargetAliasRow = typeof targetAliasesTable.$inferSelect;
export type BlastRow = typeof blastsTable.$inferSelect;
export type ClipRow = typeof clipsTable.$inferSelect;