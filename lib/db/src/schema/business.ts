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
  uniqueIndex,
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
  check("business_memberships_role_check", sql`${table.role} in ('owner', 'manager', 'response_only', 'analytics_only', 'analyst')`),
  check("business_memberships_status_check", sql`${table.status} in ('active', 'revoked')`),
]);

/**
 * Application-side relationship between a Business Target and its Stripe
 * subscription. Stripe remains the source of truth for billing records; this
 * table only binds provider IDs to a target and records the last entitlement
 * state received from a signed provider event.
 */
export const businessProSubscriptionsTable = pgTable("business_pro_subscriptions", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  targetId: text("target_id").notNull().references(() => targetsTable.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  provider: text("provider").notNull().default("stripe"),
  providerCustomerId: text("provider_customer_id").notNull(),
  providerSubscriptionId: text("provider_subscription_id").notNull(),
  planId: text("plan_id").notNull().default("business_pro_monthly"),
  status: text("status").notNull().default("incomplete"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("business_pro_subscriptions_target_unique").on(table.targetId),
  uniqueIndex("business_pro_subscriptions_provider_subscription_unique").on(table.provider, table.providerSubscriptionId),
  index("business_pro_subscriptions_status_idx").on(table.status, table.updatedAt),
  index("business_pro_subscriptions_owner_idx").on(table.ownerUserId, table.status),
  check("business_pro_subscriptions_provider_check", sql`${table.provider} in ('stripe')`),
  check("business_pro_subscriptions_status_check", sql`${table.status} in ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete_expired', 'paused', 'expired')`),
]);

export const businessProSubscriptionEventsTable = pgTable("business_pro_subscription_events", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  provider: text("provider").notNull().default("stripe"),
  providerEventId: text("provider_event_id").notNull(),
  eventType: text("event_type").notNull(),
  subscriptionId: text("subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("business_pro_subscription_events_provider_event_unique").on(table.provider, table.providerEventId),
  index("business_pro_subscription_events_subscription_idx").on(table.subscriptionId, table.createdAt),
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
export type BusinessProSubscription = typeof businessProSubscriptionsTable.$inferSelect;
export type BusinessProSubscriptionEvent = typeof businessProSubscriptionEventsTable.$inferSelect;
export type BusinessFollow = typeof businessFollowsTable.$inferSelect;