import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { targetsTable, usersTable } from "./social";

/** Business-specific enrichment for the canonical business Target. */
export const businessProfilesTable = pgTable("business_profiles", {
  targetId: text("target_id").primaryKey().references(() => targetsTable.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("other"),
  subcategory: text("subcategory").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  phone: text("phone").notNull().default(""),
  website: text("website").notNull().default(""),
  email: text("email").notNull().default(""),
  status: text("status").notNull().default("active"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("business_profiles_category_idx").on(table.category),
  index("business_profiles_location_idx").on(table.city, table.state),
  index("business_profiles_status_idx").on(table.status, table.verificationStatus),
  check("business_profiles_status_check", sql`${table.status} in ('active', 'hidden', 'locked')`),
  check("business_profiles_verification_check", sql`${table.verificationStatus} in ('unverified', 'pending', 'verified')`),
]);

export const businessClaimsTable = pgTable("business_claims", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  targetId: text("target_id").notNull().references(() => targetsTable.id, { onDelete: "cascade" }),
  applicantId: text("applicant_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  verificationMethod: text("verification_method").notNull(),
  evidence: text("evidence").notNull().default(""),
  status: text("status").notNull().default("pending"),
  // Admin actors are external identities; never treat them as application users.
  reviewerId: text("reviewer_id"),
  reviewNote: text("review_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("business_claims_target_status_idx").on(table.targetId, table.status, table.createdAt),
  index("business_claims_applicant_idx").on(table.applicantId, table.createdAt),
  check("business_claims_status_check", sql`${table.status} in ('pending', 'approved', 'rejected', 'more_info')`),
]);

export const businessMembershipsTable = pgTable("business_memberships", {
  targetId: text("target_id").notNull().references(() => targetsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.targetId, table.userId] }),
  index("business_memberships_user_idx").on(table.userId, table.status),
  index("business_memberships_target_idx").on(table.targetId, table.status),
  check("business_memberships_role_check", sql`${table.role} in ('owner', 'manager', 'analyst')`),
  check("business_memberships_status_check", sql`${table.status} in ('active', 'revoked')`),
]);

export const businessFollowsTable = pgTable("business_follows", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => targetsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.targetId] }),
  index("business_follows_target_created_idx").on(table.targetId, table.createdAt),
  index("business_follows_user_idx").on(table.userId, table.createdAt),
]);

export const insertBusinessProfileSchema = createInsertSchema(businessProfilesTable);
export const insertBusinessClaimSchema = createInsertSchema(businessClaimsTable);
export const insertBusinessMembershipSchema = createInsertSchema(businessMembershipsTable);
export const insertBusinessFollowSchema = createInsertSchema(businessFollowsTable);
export type BusinessProfile = typeof businessProfilesTable.$inferSelect;
export type BusinessClaim = typeof businessClaimsTable.$inferSelect;
export type BusinessMembership = typeof businessMembershipsTable.$inferSelect;
export type BusinessFollow = typeof businessFollowsTable.$inferSelect;