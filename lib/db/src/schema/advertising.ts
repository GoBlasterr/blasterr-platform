import { boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { blastsTable } from "./social.ts";

const id = () => text("id").primaryKey().$defaultFn(randomUUID);
const audited = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const advertisersTable = pgTable("advertisers", {
  id: id(), name: text("name").notNull(), status: text("status").notNull().default("active"),
  ownerClerkId: text("owner_clerk_id"), contactEmail: text("contact_email"),
  metadata: jsonb("metadata").notNull().default({}), ...audited,
}, (t) => [index("advertisers_status_idx").on(t.status), index("advertisers_owner_idx").on(t.ownerClerkId), check("advertisers_status_check", sql`${t.status} in ('active', 'suspended', 'closed')`)]);

export const campaignsTable = pgTable("ad_campaigns", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id, { onDelete: "restrict" }),
  name: text("name").notNull(), status: text("status").notNull().default("draft"),
  placements: jsonb("placements").notNull().default([]), targeting: jsonb("targeting").notNull().default({}),
  dailyBudget: numeric("daily_budget", { precision: 14, scale: 2 }), totalBudget: numeric("total_budget", { precision: 14, scale: 2 }),
  pricingModel: text("pricing_model").notNull().default("cpm"), bidAmount: numeric("bid_amount", { precision: 14, scale: 4 }),
  spentAmount: numeric("spent_amount", { precision: 14, scale: 4 }).notNull().default("0"),
  startsAt: timestamp("starts_at", { withTimezone: true }), endsAt: timestamp("ends_at", { withTimezone: true }),
  ...audited,
}, (t) => [index("ad_campaigns_advertiser_idx").on(t.advertiserId), index("ad_campaigns_status_schedule_idx").on(t.status, t.startsAt, t.endsAt), check("ad_campaigns_status_check", sql`${t.status} in ('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected')`), check("ad_campaigns_pricing_check", sql`${t.pricingModel} in ('cpm', 'cpc', 'cpa')`), check("ad_campaigns_amounts_nonnegative", sql`(${t.dailyBudget} is null or ${t.dailyBudget} >= 0) and (${t.totalBudget} is null or ${t.totalBudget} >= 0) and (${t.bidAmount} is null or ${t.bidAmount} >= 0) and ${t.spentAmount} >= 0`), check("ad_campaigns_schedule_check", sql`${t.endsAt} is null or ${t.startsAt} is null or ${t.endsAt} >= ${t.startsAt}`)]);

export const adGroupsTable = pgTable("ad_groups", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), status: text("status").notNull().default("active"),
  targeting: jsonb("targeting").notNull().default({}), frequencyCap: integer("frequency_cap"),
  ...audited,
}, (t) => [index("ad_groups_campaign_idx").on(t.campaignId), index("ad_groups_status_idx").on(t.status), check("ad_groups_frequency_cap_positive", sql`${t.frequencyCap} is null or ${t.frequencyCap} > 0`)]);

export const creativesTable = pgTable("ad_creatives", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id, { onDelete: "restrict" }),
  name: text("name").notNull(), type: text("type").notNull().default("image"), headline: text("headline").notNull().default(""),
  body: text("body").notNull().default(""), mediaUrl: text("media_url"), destinationUrl: text("destination_url"),
  metadata: jsonb("metadata").notNull().default({}), status: text("status").notNull().default("active"), ...audited,
}, (t) => [index("ad_creatives_advertiser_idx").on(t.advertiserId), index("ad_creatives_status_idx").on(t.status)]);

export const adPromotionRequestsTable = pgTable("ad_promotion_requests", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id, { onDelete: "restrict" }),
  campaignId: text("campaign_id").references(() => campaignsTable.id, { onDelete: "set null" }),
  type: text("type").notNull(), name: text("name").notNull(), description: text("description").notNull().default(""),
  status: text("status").notNull().default("pending_approval"), eligibility: jsonb("eligibility").notNull().default({}),
  budget: numeric("budget", { precision: 14, scale: 2 }), startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }), reviewedByClerkId: text("reviewed_by_clerk_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), reviewReason: text("review_reason"),
  ...audited,
}, (t) => [
  index("ad_promotion_requests_advertiser_idx").on(t.advertiserId),
  index("ad_promotion_requests_type_status_idx").on(t.type, t.status), check("ad_promotion_requests_budget_nonnegative", sql`${t.budget} is null or ${t.budget} >= 0`), check("ad_promotion_requests_schedule_check", sql`${t.endsAt} is null or ${t.startsAt} is null or ${t.endsAt} >= ${t.startsAt}`),
]);

export const adBoostRequestsTable = pgTable(
  "ad_boost_requests",
  {
    id: id(),
    blastId: text("blast_id").notNull().references(() => blastsTable.id, { onDelete: "restrict" }),
    advertisementId: text("advertisement_id"),
    requesterId: text("requester_id").notNull(),
    status: text("status").notNull().default("pending_review"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    placement: text("placement").notNull().default("home_feed"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    requestNote: text("request_note").notNull().default(""),
    reviewerClerkId: text("reviewer_clerk_id"),
    reviewNote: text("review_note"),
    ...audited,
  },
  (t) => [
    index("ad_boost_requests_status_created_idx").on(t.status, t.createdAt),
    index("ad_boost_requests_blast_idx").on(t.blastId),
    uniqueIndex("ad_boost_requests_advertisement_idx").on(t.advertisementId),
    check("ad_boost_requests_status_check", sql`${t.status} in ('pending_review', 'approved', 'paused', 'rejected')`),
    check("ad_boost_requests_budget_nonnegative", sql`${t.budget} is null or ${t.budget} >= 0`),
    check("ad_boost_requests_schedule_check", sql`${t.endsAt} is null or ${t.startsAt} is null or ${t.endsAt} >= ${t.startsAt}`),
  ],
);

export const advertisementsTable = pgTable("advertisements", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  adGroupId: text("ad_group_id").references(() => adGroupsTable.id, { onDelete: "set null" }), creativeId: text("creative_id").references(() => creativesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(), status: text("status").notNull().default("pending_approval"),
  placement: text("placement").notNull(), headline: text("headline").notNull(), body: text("body").notNull().default(""),
  mediaUrl: text("media_url"), destinationUrl: text("destination_url"), targeting: jsonb("targeting").notNull().default({}),
  frequencyCap: integer("frequency_cap"), ...audited,
}, (t) => [index("advertisements_campaign_idx").on(t.campaignId), index("advertisements_placement_status_idx").on(t.placement, t.status), check("advertisements_frequency_cap_positive", sql`${t.frequencyCap} is null or ${t.frequencyCap} > 0`)]);

export const adApprovalRecordsTable = pgTable("ad_approval_records", {
  id: id(), advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id, { onDelete: "restrict" }),
  action: text("action").notNull(), reason: text("reason"), reviewerClerkId: text("reviewer_clerk_id"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_approval_records_ad_idx").on(t.advertisementId, t.createdAt)]);

export const adEventsTable = pgTable("ad_events", {
  id: id(), advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id, { onDelete: "restrict" }),
  eventType: text("event_type").notNull(), sessionId: text("session_id"), deliveryTokenId: text("delivery_token_id"), placement: text("placement").notNull(),
  trustStatus: text("trust_status").notNull().default("trusted"), sourceHash: text("source_hash"), destinationUrl: text("destination_url"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ad_events_ad_occurred_idx").on(t.advertisementId, t.occurredAt),
  index("ad_events_type_occurred_idx").on(t.eventType, t.occurredAt),
  index("ad_events_trust_occurred_idx").on(t.trustStatus, t.occurredAt),
  index("ad_events_source_occurred_idx").on(t.sourceHash, t.occurredAt),
  uniqueIndex("ad_events_delivery_event_unique").on(t.deliveryTokenId, t.eventType),
]);

export const adSpendLedgerTable = pgTable("ad_spend_ledger", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "restrict" }),
  advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id, { onDelete: "restrict" }),
  eventId: text("event_id").notNull().references(() => adEventsTable.id, { onDelete: "restrict" }),
  pricingModel: text("pricing_model").notNull(), billableEvent: text("billable_event").notNull(),
  bidAmount: numeric("bid_amount", { precision: 14, scale: 4 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ad_spend_ledger_event_unique").on(t.eventId),
  index("ad_spend_ledger_campaign_occurred_idx").on(t.campaignId, t.occurredAt), check("ad_spend_ledger_amounts_nonnegative", sql`${t.bidAmount} >= 0 and ${t.amount} >= 0`),
]);

export const adReportsTable = pgTable("ad_reports", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "restrict" }),
  reportDate: timestamp("report_date", { withTimezone: true }).notNull(), metrics: jsonb("metrics").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_reports_campaign_date_idx").on(t.campaignId, t.reportDate), uniqueIndex("ad_reports_campaign_date_unique").on(t.campaignId, t.reportDate)]);

export const adFraudFlagsTable = pgTable("ad_fraud_flags", {
  id: id(), eventId: text("event_id").references(() => adEventsTable.id, { onDelete: "set null" }), advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("open"), severity: text("severity").notNull().default("medium"), reason: text("reason").notNull(), details: jsonb("details").notNull().default({}),
  reviewerClerkId: text("reviewer_clerk_id"), reviewedAt: timestamp("reviewed_at", { withTimezone: true }), reviewNote: text("review_note"), ...audited,
}, (t) => [index("ad_fraud_flags_ad_status_idx").on(t.advertisementId, t.status), index("ad_fraud_flags_status_severity_idx").on(t.status, t.severity)]);

export const adFraudAuditLogsTable = pgTable("ad_fraud_audit_logs", {
  id: id(), fraudFlagId: text("fraud_flag_id").notNull().references(() => adFraudFlagsTable.id),
  action: text("action").notNull(), actorClerkId: text("actor_clerk_id").notNull(), note: text("note"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_fraud_audit_flag_created_idx").on(t.fraudFlagId, t.createdAt)]);
export const advertisingAuditLogsTable = pgTable("advertising_audit_logs", {
  id: id(), actorClerkId: text("actor_clerk_id"), action: text("action").notNull(), entityType: text("entity_type").notNull(),
  entityId: text("entity_id"), reason: text("reason"), details: jsonb("details").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("advertising_audit_created_idx").on(t.createdAt), index("advertising_audit_entity_idx").on(t.entityType, t.entityId)]);

export const adBillingProfilesTable = pgTable("ad_billing_profiles", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(), providerCustomerId: text("provider_customer_id").notNull(),
  status: text("status").notNull().default("active"), currency: text("currency").notNull().default("usd"),
  ...audited,
}, (t) => [
  uniqueIndex("ad_billing_profiles_advertiser_unique").on(t.advertiserId),
  uniqueIndex("ad_billing_profiles_provider_customer_unique").on(t.provider, t.providerCustomerId),
]);

export const adTransactionsTable = pgTable("ad_transactions", {
  id: id(), advertiserId: text("advertiser_id").references(() => advertisersTable.id, { onDelete: "restrict" }),
  campaignId: text("campaign_id").references(() => campaignsTable.id, { onDelete: "restrict" }), provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id").notNull(), transactionType: text("transaction_type").notNull(),
  status: text("status").notNull(), amountMinor: integer("amount_minor").notNull(), refundedAmountMinor: integer("refunded_amount_minor").notNull().default(0),
  currency: text("currency").notNull(), invoiceUrl: text("invoice_url"), providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}), ...audited,
}, (t) => [
  uniqueIndex("ad_transactions_provider_id_unique").on(t.provider, t.providerTransactionId),
  index("ad_transactions_advertiser_created_idx").on(t.advertiserId, t.createdAt),
  index("ad_transactions_status_created_idx").on(t.status, t.createdAt), check("ad_transactions_amounts_nonnegative", sql`${t.amountMinor} >= 0 and ${t.refundedAmountMinor} >= 0 and ${t.refundedAmountMinor} <= ${t.amountMinor}`),
]);

export const adBillingEventsTable = pgTable("ad_billing_events", {
  id: id(), provider: text("provider").notNull(), providerEventId: text("provider_event_id").notNull(),
  eventType: text("event_type").notNull(), status: text("status").notNull().default("processed"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ad_billing_events_provider_id_unique").on(t.provider, t.providerEventId),
  index("ad_billing_events_received_idx").on(t.receivedAt),
]);

export const adRefundsTable = pgTable("ad_refunds", {
  id: id(), transactionId: text("transaction_id").notNull().references(() => adTransactionsTable.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(), providerRefundId: text("provider_refund_id"),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(),
  status: text("status").notNull(), reason: text("reason"), requestedByClerkId: text("requested_by_clerk_id"),
  authorizationConfirmedAt: timestamp("authorization_confirmed_at", { withTimezone: true }),
  providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }),
  ...audited,
}, (t) => [
  uniqueIndex("ad_refunds_provider_id_unique").on(t.provider, t.providerRefundId),
  index("ad_refunds_transaction_idx").on(t.transactionId), check("ad_refunds_amount_nonnegative", sql`${t.amountMinor} >= 0`),
]);

export const advertisingSettingsTable = pgTable("advertising_settings", {
  id: text("id").primaryKey().default("singleton"), enabled: boolean("enabled").notNull().default(true),
  emergencyShutdown: boolean("emergency_shutdown").notNull().default(false), placementSettings: jsonb("placement_settings").notNull().default({}),
  frequencySettings: jsonb("frequency_settings").notNull().default({}), featureFlags: jsonb("feature_flags").notNull().default({}),
  updatedByClerkId: text("updated_by_clerk_id"), ...audited,
});

export const adFraudNotificationsTable = pgTable("ad_fraud_notifications", {
  id: id(), fraudFlagId: text("fraud_flag_id").references(() => adFraudFlagsTable.id),
  adminClerkId: text("admin_clerk_id"), severity: text("severity").notNull(), title: text("title").notNull(), message: text("message").notNull(),
  read: boolean("read").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_fraud_notifications_admin_read_idx").on(t.adminClerkId, t.read, t.createdAt), index("ad_fraud_notifications_flag_idx").on(t.fraudFlagId)]);
