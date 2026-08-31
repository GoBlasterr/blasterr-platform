import {
  adBillingEventsTable,
  adBillingProfilesTable,
  adRefundsTable,
  adTransactionsTable,
  advertisersTable,
  campaignsTable,
  db,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { verifyStripeSignature } from "./billing-signatures";
import { reconcileRefunds } from "./billing-accounting";

type BillingProvider = "stripe";
type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
const stringValue = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;
const integerValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : null;

export function getBillingProvider(): BillingProvider | null {
  return process.env.AD_BILLING_PROVIDER === "stripe" && Boolean(process.env.AD_BILLING_WEBHOOK_SECRET)
    ? "stripe"
    : null;
}

async function knownRelations(metadata: UnknownRecord) {
  const advertiserId = stringValue(metadata.advertiserId ?? metadata.advertiser_id);
  const campaignId = stringValue(metadata.campaignId ?? metadata.campaign_id);
  const [advertiser, campaign] = await Promise.all([
    advertiserId
      ? db.select({ id: advertisersTable.id }).from(advertisersTable).where(eq(advertisersTable.id, advertiserId)).limit(1)
      : Promise.resolve([]),
    campaignId
      ? db.select({ id: campaignsTable.id, advertiserId: campaignsTable.advertiserId }).from(campaignsTable).where(eq(campaignsTable.id, campaignId)).limit(1)
      : Promise.resolve([]),
  ]);
  const knownAdvertiserId = advertiser[0]?.id ?? null;
  const knownCampaignId = campaign[0]?.advertiserId === knownAdvertiserId ? campaign[0].id : null;
  return { advertiserId: knownAdvertiserId, campaignId: knownCampaignId };
}

async function processStripeEvent(payload: UnknownRecord): Promise<boolean> {
  const providerEventId = stringValue(payload.id);
  const eventType = stringValue(payload.type);
  const data = asRecord(payload.data);
  const object = asRecord(data.object);
  if (!providerEventId || !eventType || !stringValue(object.id)) throw new Error("Invalid Stripe event.");
  const supportedPrefixes = ["payment_intent.", "charge.", "invoice.", "refund."];
  if (!supportedPrefixes.some((prefix) => eventType.startsWith(prefix))) throw new Error("Unsupported Stripe event.");

  return db.transaction(async (tx) => {
    const claimed = await tx.insert(adBillingEventsTable).values({
      provider: "stripe",
      providerEventId,
      eventType,
    }).onConflictDoNothing().returning({ id: adBillingEventsTable.id });
    if (claimed.length === 0) return false;

    const metadata = asRecord(object.metadata);
    const providerTransactionId = stringValue(object.payment_intent) ?? stringValue(object.charge) ?? stringValue(object.id);
    const amountMinor = integerValue(object.amount_received)
      ?? integerValue(object.amount_paid)
      ?? integerValue(object.amount)
      ?? integerValue(object.amount_due)
      ?? 0;
    const refundedAmountMinor = integerValue(object.amount_refunded) ?? 0;
    const currency = stringValue(object.currency)?.toLowerCase() ?? "usd";
    const providerCreatedAt = integerValue(payload.created) !== null
      ? new Date((integerValue(payload.created) ?? 0) * 1000)
      : null;
    const invoiceUrl = stringValue(object.hosted_invoice_url) ?? stringValue(object.receipt_url);
    const customerId = stringValue(object.customer);
    const status = eventType.includes("failed")
      ? "failed"
      : eventType.includes("refunded") || refundedAmountMinor > 0
        ? (refundedAmountMinor >= amountMinor && amountMinor > 0 ? "refunded" : "partially_refunded")
        : eventType.includes("dispute")
          ? "disputed"
          : eventType.includes("succeeded") || eventType.endsWith(".paid")
            ? "settled"
            : stringValue(object.status) ?? "pending";
    const transactionType = eventType.startsWith("invoice.") ? "invoice" : eventType.includes("dispute") ? "chargeback" : "charge";

    if (eventType.startsWith("refund.")) {
      const [transaction] = await tx.select().from(adTransactionsTable)
        .where(and(eq(adTransactionsTable.provider, "stripe"), eq(adTransactionsTable.providerTransactionId, providerTransactionId!)))
        .limit(1);
      if (!transaction?.advertiserId) throw new Error("Refund does not reference a known advertising transaction.");
      const providerRefundId = stringValue(object.id)!;
      const refundStatus = eventType.endsWith(".failed") ? "failed" : stringValue(object.status) ?? "processing";
      await tx.insert(adRefundsTable).values({
        transactionId: transaction.id,
        provider: "stripe",
        providerRefundId,
        amountMinor,
        currency,
        status: refundStatus,
        providerCreatedAt,
      }).onConflictDoUpdate({
        target: [adRefundsTable.provider, adRefundsTable.providerRefundId],
        set: { amountMinor, currency, status: refundStatus, providerCreatedAt, updatedAt: new Date() },
      });
      const refunds = await tx.select({ amountMinor: adRefundsTable.amountMinor, status: adRefundsTable.status })
        .from(adRefundsTable).where(eq(adRefundsTable.transactionId, transaction.id));
      const reconciled = reconcileRefunds(transaction.amountMinor, transaction.status, refunds);
      await tx.update(adTransactionsTable).set({
        refundedAmountMinor: reconciled.refundedAmountMinor,
        status: reconciled.status,
        updatedAt: new Date(),
      }).where(eq(adTransactionsTable.id, transaction.id));
      return true;
    }

    const { advertiserId, campaignId } = await knownRelations(metadata);
    if (!advertiserId || !customerId) throw new Error("Stripe event is not linked to a BLASTERR billing profile.");
    const [billingProfile] = await tx.select().from(adBillingProfilesTable).where(eq(adBillingProfilesTable.advertiserId, advertiserId)).limit(1);
    if (billingProfile && (billingProfile.provider !== "stripe" || billingProfile.providerCustomerId !== customerId)) {
      throw new Error("Stripe customer does not match the advertiser billing profile.");
    }

    const [existing] = await tx.select().from(adTransactionsTable)
      .where(and(eq(adTransactionsTable.provider, "stripe"), eq(adTransactionsTable.providerTransactionId, providerTransactionId!)))
      .limit(1);
    if (!existing) {
      await tx.insert(adTransactionsTable).values({
        advertiserId, campaignId, provider: "stripe", providerTransactionId: providerTransactionId!,
        transactionType, status, amountMinor, refundedAmountMinor, currency, invoiceUrl, providerCreatedAt,
        metadata: { providerEventType: eventType },
      });
    } else if (!existing.providerCreatedAt || !providerCreatedAt || providerCreatedAt >= existing.providerCreatedAt) {
      await tx.update(adTransactionsTable).set({
        advertiserId, campaignId, transactionType, status, amountMinor,
        refundedAmountMinor: Math.max(existing.refundedAmountMinor, refundedAmountMinor),
        currency, invoiceUrl, providerCreatedAt, metadata: { providerEventType: eventType }, updatedAt: new Date(),
      }).where(eq(adTransactionsTable.id, existing.id));
    }

    if (advertiserId && customerId) {
      await tx.insert(adBillingProfilesTable).values({
        advertiserId,
        provider: "stripe",
        providerCustomerId: customerId,
        currency,
      }).onConflictDoUpdate({
        target: adBillingProfilesTable.advertiserId,
        set: { providerCustomerId: customerId, currency, status: "active", updatedAt: new Date() },
      });
    }
    return true;
  });
}

export async function handleAdvertisingBillingWebhook(req: Request, res: Response): Promise<void> {
  const provider = getBillingProvider();
  const secret = process.env.AD_BILLING_WEBHOOK_SECRET;
  if (!provider || !secret) {
    res.status(503).json({ error: "Approved billing provider is not connected." });
    return;
  }
  const signatureHeader = req.headers["stripe-signature"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!Buffer.isBuffer(req.body) || !signature || !verifyStripeSignature(req.body, signature, secret)) {
    res.status(400).json({ error: "Invalid billing provider signature." });
    return;
  }
  try {
    const payload = asRecord(JSON.parse(req.body.toString("utf8")));
    const processed = await processStripeEvent(payload);
    res.status(200).json({ received: true, processed });
  } catch (error) {
    req.log.warn({ err: error }, "Rejected advertising billing webhook");
    res.status(400).json({ error: "Invalid billing provider event." });
  }
}