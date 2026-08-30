import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("targets_slug_idx").on(table.slug), index("targets_type_idx").on(table.type)],
);

export const blastsTable = pgTable(
  "blasts",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull().references(() => usersTable.id),
    targetId: text("target_id").notNull().references(() => targetsTable.id),
    originalBlastId: text("original_blast_id"),
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
  ],
);

export const clipsTable = pgTable(
  "clips",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    blastId: text("blast_id").notNull().references(() => blastsTable.id),
    creatorId: text("creator_id").notNull().references(() => usersTable.id),
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
  ],
);

export const clipAssetsTable = pgTable(
  "clip_assets",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    clipId: text("clip_id").notNull().references(() => clipsTable.id),
    assetType: text("asset_type").notNull(),
    assetUrl: text("asset_url").notNull(),
    assetOrder: integer("asset_order").notNull().default(0),
    duration: integer("duration"),
  },
  (table) => [index("clip_assets_clip_idx").on(table.clipId)],
);

export const clipSettingsTable = pgTable("clip_settings", {
  clipId: text("clip_id").primaryKey().references(() => clipsTable.id),
  captionStyle: text("caption_style").notNull().default("bold"),
  captionPosition: text("caption_position").notNull().default("center"),
  captionAnimation: text("caption_animation").notNull().default("pop"),
  brandingStyle: text("branding_style").notNull().default("full"),
  musicId: text("music_id"),
  voiceoverEnabled: boolean("voiceover_enabled").notNull().default(false),
  ctaText: text("cta_text").notNull().default("See the full Blast on BLASTERR"),
  background: text("background").notNull().default("cosmic"),
  duration: integer("duration").notNull().default(30),
});

export const clipDistributionTable = pgTable(
  "clip_distribution",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    clipId: text("clip_id").notNull().references(() => clipsTable.id),
    platform: text("platform").notNull(),
    status: text("status").notNull().default("NOT_CONNECTED"),
    externalPostId: text("external_post_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    errorMessage: text("error_message"),
  },
  (table) => [index("clip_distribution_clip_idx").on(table.clipId)],
);

export const musicAssetsTable = pgTable("music_assets", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  title: text("title").notNull(),
  artist: text("artist").notNull().default("BLASTERR"),
  licenseType: text("license_type").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const clipAnalyticsTable = pgTable(
  "clip_analytics",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    clipId: text("clip_id").notNull().references(() => clipsTable.id),
    platform: text("platform").notNull(),
    views: integer("views").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("clip_analytics_clip_recorded_idx").on(table.clipId, table.recordedAt)],
);

export const contentPermissionsTable = pgTable("content_permissions", {
  blastId: text("blast_id").primaryKey().references(() => blastsTable.id),
  allowClipCreation: boolean("allow_clip_creation").notNull().default(true),
  allowExternalSharing: boolean("allow_external_sharing").notNull().default(false),
  allowPromotionalUse: boolean("allow_promotional_use").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  blastId: text("blast_id").notNull().references(() => blastsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  parentCommentId: text("parent_comment_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reactionsTable = pgTable(
  "reactions",
  {
    blastId: text("blast_id").notNull().references(() => blastsTable.id),
    userId: text("user_id").notNull().references(() => usersTable.id),
    reactionType: text("reaction_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blastId, table.userId] })],
);

export const followsTable = pgTable(
  "follows",
  {
    followerId: text("follower_id").notNull().references(() => usersTable.id),
    followingId: text("following_id").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: text("user_id").notNull().references(() => usersTable.id),
    blastId: text("blast_id").notNull().references(() => blastsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.blastId] })],
);

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  userId: text("user_id").notNull().references(() => usersTable.id),
  actorId: text("actor_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(),
  referenceId: text("reference_id"),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  reporterId: text("reporter_id").notNull().references(() => usersTable.id),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blocksTable = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id").notNull().references(() => usersTable.id),
    blockedId: text("blocked_id").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] })],
);

export const insertUserSchema = createInsertSchema(usersTable);
export const insertTargetSchema = createInsertSchema(targetsTable);
export const insertBlastSchema = createInsertSchema(blastsTable);
export const insertCommentSchema = createInsertSchema(commentsTable);
export const insertReportSchema = createInsertSchema(reportsTable);
export const insertClipSchema = createInsertSchema(clipsTable);

export type UserRow = typeof usersTable.$inferSelect;
export type TargetRow = typeof targetsTable.$inferSelect;
export type BlastRow = typeof blastsTable.$inferSelect;
export type ClipRow = typeof clipsTable.$inferSelect;