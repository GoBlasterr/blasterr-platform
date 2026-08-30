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

export type UserRow = typeof usersTable.$inferSelect;
export type TargetRow = typeof targetsTable.$inferSelect;
export type BlastRow = typeof blastsTable.$inferSelect;