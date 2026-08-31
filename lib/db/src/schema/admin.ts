import { boolean, check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

export const adminReportsTable = pgTable(
  "admin_reports",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    reporterId: text("reporter_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("open"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_reports_status_created_idx").on(table.status, table.createdAt),
    index("admin_reports_target_idx").on(table.targetType, table.targetId),
    check("admin_reports_status_check", sql`${table.status} in ('open', 'reviewing', 'resolved', 'dismissed')`),
    check("admin_reports_target_type_check", sql`${table.targetType} in ('user', 'blast', 'comment', 'target')`),
  ],
);

export const adminAuditEventsTable = pgTable(
  "admin_audit_events",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    actorId: text("actor_id").notNull(),
    details: text("details").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_events_created_idx").on(table.createdAt),
    index("admin_audit_events_entity_idx").on(table.entityType, table.entityId),
    index("admin_audit_events_actor_idx").on(table.actorId, table.createdAt),
  ],
);

export const adminContentStatusesTable = pgTable("admin_content_statuses", {
  contentId: text("content_id").primaryKey(),
  status: text("status").notNull().default("published"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminSettingsTable = pgTable("admin_settings", {
  id: text("id").primaryKey().default("singleton"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  contentReviewMode: boolean("content_review_mode").notNull().default(false),
  supportEmail: text("support_email").notNull().default("support@blasterr.social"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const adminFeatureFlagsTable = pgTable("admin_feature_flags", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const adminAnnouncementsTable = pgTable(
  "admin_announcements",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    title: text("title").notNull(),
    message: text("message").notNull(),
    audience: text("audience").notNull().default("all"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by"),
  },
  (table) => [index("admin_announcements_status_idx").on(table.status, table.updatedAt), check("admin_announcements_status_check", sql`${table.status} in ('draft', 'scheduled', 'published', 'archived')`), check("admin_announcements_audience_check", sql`${table.audience} in ('all', 'users', 'advertisers', 'admins')`)],
);

export const insertAdminReportSchema = createInsertSchema(adminReportsTable);
export const insertAdminAuditEventSchema = createInsertSchema(adminAuditEventsTable);
export const insertAdminContentStatusSchema = createInsertSchema(adminContentStatusesTable);
export const insertAdminSettingsSchema = createInsertSchema(adminSettingsTable);
export const insertAdminFeatureFlagSchema = createInsertSchema(adminFeatureFlagsTable);
export const insertAdminAnnouncementSchema = createInsertSchema(adminAnnouncementsTable);

export type AdminReportRow = typeof adminReportsTable.$inferSelect;
export type AdminAuditEventRow = typeof adminAuditEventsTable.$inferSelect;
export type AdminContentStatusRow = typeof adminContentStatusesTable.$inferSelect;
export type AdminSettingsRow = typeof adminSettingsTable.$inferSelect;
export type AdminFeatureFlagRow = typeof adminFeatureFlagsTable.$inferSelect;
export type AdminAnnouncementRow = typeof adminAnnouncementsTable.$inferSelect;