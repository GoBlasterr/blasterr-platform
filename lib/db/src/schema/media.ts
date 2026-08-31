import { index, integer, pgTable, text, timestamp, uniqueIndex, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

export const mediaAssetsTable = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    ownerId: text("owner_id").notNull(),
    provider: text("provider").notNull().default("cloudflare-r2"),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    purpose: text("purpose").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    visibility: text("visibility").notNull().default("public"),
    lifecycleStatus: text("lifecycle_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_assets_provider_object_unique").on(table.provider, table.bucket, table.objectKey),
    index("media_assets_owner_created_idx").on(table.ownerId, table.createdAt),
    index("media_assets_purpose_status_idx").on(table.purpose, table.lifecycleStatus),
    index("media_assets_resource_idx").on(table.resourceType, table.resourceId),
    check("media_assets_size_positive", sql`${table.sizeBytes} > 0`),
    check("media_assets_visibility_check", sql`${table.visibility} in ('public', 'private')`),
    check("media_assets_lifecycle_status_check", sql`${table.lifecycleStatus} in ('pending', 'ready', 'failed', 'deleted')`),
  ],
);

export const insertMediaAssetSchema = createInsertSchema(mediaAssetsTable);
export type MediaAssetRow = typeof mediaAssetsTable.$inferSelect;