import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

const id = () => text("id").primaryKey().$defaultFn(randomUUID);
const audited = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const advertisersTable = pgTable("advertisers", {
  id: id(), name: text("name").notNull(), status: text("status").notNull().default("active"),
  ownerClerkId: text("owner_clerk_id"), contactEmail: text("contact_email"),
  metadata: jsonb("metadata").notNull().default({}), ...audited,
}, (t) => [index("advertisers_status_idx").on(t.status), index("advertisers_owner_idx").on(t.ownerClerkId)]);

export const campaignsTable = pgTable("ad_campaigns", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id),
  name: text("name").notNull(), status: text("status").notNull().default("draft"),
  placements: jsonb("placements").notNull().default([]), targeting: jsonb("targeting").notNull().default({}),
  dailyBudget: numeric("daily_budget", { precision: 14, scale: 2 }), totalBudget: numeric("total_budget", { precision: 14, scale: 2 }),
  pricingModel: text("pricing_model").notNull().default("cpm"), bidAmount: numeric("bid_amount", { precision: 14, scale: 4 }),
  spentAmount: numeric("spent_amount", { precision: 14, scale: 4 }).notNull().default("0"),
  startsAt: timestamp("starts_at", { withTimezone: true }), endsAt: timestamp("ends_at", { withTimezone: true }),
  ...audited,
}, (t) => [index("ad_campaigns_advertiser_idx").on(t.advertiserId), index("ad_campaigns_status_schedule_idx").on(t.status, t.startsAt, t.endsAt)]);

export const adGroupsTable = pgTable("ad_groups", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id),
  name: text("name").notNull(), status: text("status").notNull().default("active"),
  targeting: jsonb("targeting").notNull().default({}), frequencyCap: integer("frequency_cap"),
  ...audited,
}, (t) => [index("ad_groups_campaign_idx").on(t.campaignId), index("ad_groups_status_idx").on(t.status)]);

export const creativesTable = pgTable("ad_creatives", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id),
  name: text("name").notNull(), type: text("type").notNull().default("image"), headline: text("headline").notNull().default(""),
  body: text("body").notNull().default(""), mediaUrl: text("media_url"), destinationUrl: text("destination_url"),
  metadata: jsonb("metadata").notNull().default({}), status: text("status").notNull().default("active"), ...audited,
}, (t) => [index("ad_creatives_advertiser_idx").on(t.advertiserId), index("ad_creatives_status_idx").on(t.status)]);

export const adPromotionRequestsTable = pgTable("ad_promotion_requests", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id),
  campaignId: text("campaign_id").references(() => campaignsTable.id),
  type: text("type").notNull(), name: text("name").notNull(), description: text("description").notNull().default(""),
  status: text("status").notNull().default("pending_approval"), eligibility: jsonb("eligibility").notNull().default({}),
  budget: numeric("budget", { precision: 14, scale: 2 }), startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }), reviewedByClerkId: text("reviewed_by_clerk_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), reviewReason: text("review_reason"),
  ...audited,
}, (t) => [
  index("ad_promotion_requests_advertiser_idx").on(t.advertiserId),
  index("ad_promotion_requests_type_status_idx").on(t.type, t.status),
]);

export const advertisementsTable = pgTable("advertisements", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id),
  adGroupId: text("ad_group_id").references(() => adGroupsTable.id), creativeId: text("creative_id").references(() => creativesTable.id),
  name: text("name").notNull(), status: text("status").notNull().default("pending_approval"),
  placement: text("placement").notNull(), headline: text("headline").notNull(), body: text("body").notNull().default(""),
  mediaUrl: text("media_url"), destinationUrl: text("destination_url"), targeting: jsonb("targeting").notNull().default({}),
  frequencyCap: integer("frequency_cap"), ...audited,
}, (t) => [index("advertisements_campaign_idx").on(t.campaignId), index("advertisements_placement_status_idx").on(t.placement, t.status)]);

export const adApprovalRecordsTable = pgTable("ad_approval_records", {
  id: id(), advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id),
  action: text("action").notNull(), reason: text("reason"), reviewerClerkId: text("reviewer_clerk_id"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_approval_records_ad_idx").on(t.advertisementId, t.createdAt)]);

export const adEventsTable = pgTable("ad_events", {
  id: id(), advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id),
  eventType: text("event_type").notNull(), sessionId: text("session_id"), deliveryTokenId: text("delivery_token_id"), placement: text("placement").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ad_events_ad_occurred_idx").on(t.advertisementId, t.occurredAt),
  index("ad_events_type_occurred_idx").on(t.eventType, t.occurredAt),
  uniqueIndex("ad_events_delivery_event_unique").on(t.deliveryTokenId, t.eventType),
]);

export const adSpendLedgerTable = pgTable("ad_spend_ledger", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id),
  advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id),
  eventId: text("event_id").notNull().references(() => adEventsTable.id),
  pricingModel: text("pricing_model").notNull(), billableEvent: text("billable_event").notNull(),
  bidAmount: numeric("bid_amount", { precision: 14, scale: 4 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ad_spend_ledger_event_unique").on(t.eventId),
  index("ad_spend_ledger_campaign_occurred_idx").on(t.campaignId, t.occurredAt),
]);

export const adReportsTable = pgTable("ad_reports", {
  id: id(), campaignId: text("campaign_id").notNull().references(() => campaignsTable.id),
  reportDate: timestamp("report_date", { withTimezone: true }).notNull(), metrics: jsonb("metrics").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_reports_campaign_date_idx").on(t.campaignId, t.reportDate)]);

export const adFraudFlagsTable = pgTable("ad_fraud_flags", {
  id: id(), eventId: text("event_id").references(() => adEventsTable.id), advertisementId: text("advertisement_id").notNull().references(() => advertisementsTable.id),
  status: text("status").notNull().default("open"), reason: text("reason").notNull(), details: jsonb("details").notNull().default({}), ...audited,
}, (t) => [index("ad_fraud_flags_ad_status_idx").on(t.advertisementId, t.status)]);

export const advertisingAuditLogsTable = pgTable("advertising_audit_logs", {
  id: id(), actorClerkId: text("actor_clerk_id"), action: text("action").notNull(), entityType: text("entity_type").notNull(),
  entityId: text("entity_id"), reason: text("reason"), details: jsonb("details").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("advertising_audit_created_idx").on(t.createdAt), index("advertising_audit_entity_idx").on(t.entityType, t.entityId)]);

export const adBillingProfilesTable = pgTable("ad_billing_profiles", {
  id: id(), advertiserId: text("advertiser_id").notNull().references(() => advertisersTable.id),
  provider: text("provider").notNull(), providerCustomerId: text("provider_customer_id").notNull(),
  status: text("status").notNull().default("active"), currency: text("currency").notNull().default("usd"),
  ...audited,
}, (t) => [
  uniqueIndex("ad_billing_profiles_advertiser_unique").on(t.advertiserId),
  uniqueIndex("ad_billing_profiles_provider_customer_unique").on(t.provider, t.providerCustomerId),
]);

export const adTransactionsTable = pgTable("ad_transactions", {
  id: id(), advertiserId: text("advertiser_id").references(() => advertisersTable.id),
  campaignId: text("campaign_id").references(() => campaignsTable.id), provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id").notNull(), transactionType: text("transaction_type").notNull(),
  status: text("status").notNull(), amountMinor: integer("amount_minor").notNull(), refundedAmountMinor: integer("refunded_amount_minor").notNull().default(0),
  currency: text("currency").notNull(), invoiceUrl: text("invoice_url"), providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}), ...audited,
}, (t) => [
  uniqueIndex("ad_transactions_provider_id_unique").on(t.provider, t.providerTransactionId),
  index("ad_transactions_advertiser_created_idx").on(t.advertiserId, t.createdAt),
  index("ad_transactions_status_created_idx").on(t.status, t.createdAt),
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
  id: id(), transactionId: text("transaction_id").notNull().references(() => adTransactionsTable.id),
  provider: text("provider").notNull(), providerRefundId: text("provider_refund_id"),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(),
  status: text("status").notNull(), reason: text("reason"), requestedByClerkId: text("requested_by_clerk_id"),
  authorizationConfirmedAt: timestamp("authorization_confirmed_at", { withTimezone: true }),
  providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }),
  ...audited,
}, (t) => [
  uniqueIndex("ad_refunds_provider_id_unique").on(t.provider, t.providerRefundId),
  index("ad_refunds_transaction_idx").on(t.transactionId),
]);

export const advertisingSettingsTable = pgTable("advertising_settings", {
  id: text("id").primaryKey().default("singleton"), enabled: boolean("enabled").notNull().default(true),
  emergencyShutdown: boolean("emergency_shutdown").notNull().default(false), placementSettings: jsonb("placement_settings").notNull().default({}),
  frequencySettings: jsonb("frequency_settings").notNull().default({}), featureFlags: jsonb("feature_flags").notNull().default({}),
  updatedByClerkId: text("updated_by_clerk_id"), ...audited,
});