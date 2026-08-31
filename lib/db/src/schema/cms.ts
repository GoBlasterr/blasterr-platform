import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const cmsEntriesTable = pgTable(
  "cms_entries",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    type: text("type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: jsonb("body").$type<Record<string, unknown>>().notNull().default({}),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    featuredImage: text("featured_image").notNull().default(""),
    status: text("status").notNull().default("draft"),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("cms_entries_type_slug_unique").on(table.type, table.slug),
    index("cms_entries_type_status_idx").on(table.type, table.status),
    index("cms_entries_publish_at_idx").on(table.publishAt),
  ],
);

export const cmsSettingsTable = pgTable(
  "cms_settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type CmsEntryRow = typeof cmsEntriesTable.$inferSelect;
export type CmsSettingRow = typeof cmsSettingsTable.$inferSelect;