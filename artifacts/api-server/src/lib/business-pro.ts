import { and, desc, eq, sql } from "drizzle-orm";
import {
  businessMembershipsTable,
  businessProSubscriptionEventsTable,
  businessProSubscriptionsTable,
  db,
  targetsTable,
} from "@workspace/db";
import Stripe from "stripe";
import { getStripeClient, getStripeSync } from "./stripe-client";

export const BUSINESS_PRO_PLAN_ID = "business_pro_monthly";
export const BUSINESS_PRO_PRICE_ID = "price_1UHsRnDA38rGKJNoer0HVRUx";
export const BUSINESS_PRO_PRICE_CENTS = 4900;

const ACCESSIBLE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type BusinessProSummary = {
  planId: typeof BUSINESS_PRO_PLAN_ID;
  priceCents: number;
  currency: "usd";
  status: string | null;
  hasAccess: boolean;
  isOwner: boolean;
  canUpgrade: boolean;
  cancelAtPeriodEnd: boolean;
};

export async function getBusinessProSummary(targetId: string, userId?: string): Promise<BusinessProSummary> {
  const [target, membership, subscription] = await Promise.all([
    db.select({ verified: targetsTable.verified }).from(targetsTable)
      .where(and(eq(targetsTable.id, targetId), eq(targetsTable.type, "business"))).limit(1),
    userId
      ? db.select({ role: businessMembershipsTable.role }).from(businessMembershipsTable)
        .where(and(eq(businessMembershipsTable.targetId, targetId), eq(businessMembershipsTable.userId, userId), eq(businessMembershipsTable.status, "active"))).limit(1)
      : Promise.resolve([]),
    db.select({
      status: businessProSubscriptionsTable.status,
      cancelAtPeriodEnd: businessProSubscriptionsTable.cancelAtPeriodEnd,
      suspendedAt: businessProSubscriptionsTable.suspendedAt,
    }).from(businessProSubscriptionsTable)
      .where(eq(businessProSubscriptionsTable.targetId, targetId))
      .orderBy(desc(businessProSubscriptionsTable.updatedAt)).limit(1),
  ]);

  const isOwner = membership[0]?.role === "owner";
  const status = subscription[0]?.status ?? null;
  const hasAccess = Boolean(
    target[0]?.verified &&
    isOwner &&
    status &&
    ACCESSIBLE_STATUSES.has(status) &&
    !subscription[0]?.suspendedAt,
  );
  return {
    planId: BUSINESS_PRO_PLAN_ID,
    priceCents: BUSINESS_PRO_PRICE_CENTS,
    currency: "usd",
    status,
    hasAccess,
    isOwner,
    canUpgrade: Boolean(target[0]?.verified && isOwner && !hasAccess),
    cancelAtPeriodEnd: subscription[0]?.cancelAtPeriodEnd ?? false,
  };
}

export async function requireBusinessProOwner(targetId: string, userId: string) {
  const [target, membership] = await Promise.all([
    db.select({ id: targetsTable.id, verified: targetsTable.verified, slug: targetsTable.slug }).from(targetsTable)
      .where(and(eq(targetsTable.id, targetId), eq(targetsTable.type, "business"))).limit(1),
    db.select({ role: businessMembershipsTable.role }).from(businessMembershipsTable)
      .where(and(eq(businessMembershipsTable.targetId, targetId), eq(businessMembershipsTable.userId, userId), eq(businessMembershipsTable.status, "active"))).limit(1),
  ]);
  if (!target[0]) return { error: "not_found" as const };
  if (membership[0]?.role !== "owner") return { error: "forbidden" as const };
  if (!target[0].verified) return { error: "unverified" as const };
  return { target: target[0] };
}

export async function createBusinessProCheckout(input: {
  targetId: string;
  userId: string;
  email: string;
  name: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const access = await requireBusinessProOwner(input.targetId, input.userId);
  if ("error" in access) return { error: access.error };

  const current = await getBusinessProSummary(input.targetId, input.userId);
  if (current.hasAccess) return { error: "already_active" as const };

  const stripe = await getStripeClient();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: { businessTargetId: input.targetId, ownerUserId: input.userId },
  });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: BUSINESS_PRO_PRICE_ID, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.targetId,
    subscription_data: {
      metadata: {
        planId: BUSINESS_PRO_PLAN_ID,
        businessTargetId: input.targetId,
        ownerUserId: input.userId,
      },
    },
    metadata: {
      planId: BUSINESS_PRO_PLAN_ID,
      businessTargetId: input.targetId,
      ownerUserId: input.userId,
    },
  });
  if (!session.url) return { error: "checkout_unavailable" as const };
  return { url: session.url, sessionId: session.id };
}

function stripeStatus(value: Stripe.Subscription.Status): string {
  return value;
}

async function syncSubscription(subscription: Stripe.Subscription, eventId?: string, eventType = "subscription.sync") {
  const metadata = subscription.metadata ?? {};
  const targetId = metadata.businessTargetId;
  const ownerUserId = metadata.ownerUserId;
  if (!targetId || !ownerUserId) return false;

  return db.transaction(async (tx) => {
    if (eventId) {
      const claimed = await tx.insert(businessProSubscriptionEventsTable).values({
        provider: "stripe",
        providerEventId: eventId,
        eventType,
        subscriptionId: subscription.id,
      }).onConflictDoNothing().returning({ id: businessProSubscriptionEventsTable.id });
      if (!claimed.length) return false;
    }
    await tx.insert(businessProSubscriptionsTable).values({
      targetId,
      ownerUserId,
      provider: "stripe",
      providerCustomerId: String(subscription.customer),
      providerSubscriptionId: subscription.id,
      planId: BUSINESS_PRO_PLAN_ID,
      status: stripeStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: businessProSubscriptionsTable.targetId,
      set: {
        ownerUserId,
        providerCustomerId: String(subscription.customer),
        providerSubscriptionId: subscription.id,
        status: stripeStatus(subscription.status),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        updatedAt: new Date(),
      },
    });
    return true;
  });
}

export async function syncBusinessProCheckoutSession(sessionId: string) {
  const stripe = await getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.mode !== "subscription" || !session.subscription) return false;
  const subscription = typeof session.subscription === "string"
    ? await stripe.subscriptions.retrieve(session.subscription)
    : session.subscription;
  return syncSubscription(subscription);
}

export async function handleBusinessProWebhook(payload: Buffer, signature: string) {
  const { getStripeWebhookSecret } = await import("./stripe-client");
  const webhookSecret = await getStripeWebhookSecret();
  if (!webhookSecret) throw new Error("Stripe webhook signing secret is not configured.");
  const stripe = await getStripeClient();
  const stripeSync = await getStripeSync();
  await stripeSync.processWebhook(payload, signature);
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  if (event.type.startsWith("customer.subscription.")) {
    return syncSubscription(event.data.object as Stripe.Subscription, event.id, event.type);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      return syncSubscription(subscription, event.id, event.type);
    }
  }
  return false;
}

export async function createBusinessProPortal(targetId: string, userId: string, returnUrl: string) {
  const access = await requireBusinessProOwner(targetId, userId);
  if ("error" in access) return access;
  const subscription = await db.select({ customerId: businessProSubscriptionsTable.providerCustomerId })
    .from(businessProSubscriptionsTable).where(eq(businessProSubscriptionsTable.targetId, targetId)).limit(1);
  if (!subscription[0]) return { error: "not_subscribed" as const };
  const stripe = await getStripeClient();
  const session = await stripe.billingPortal.sessions.create({ customer: subscription[0].customerId, return_url: returnUrl });
  return { url: session.url };
}

export async function getAdminBusinessProSummary() {
  const [counts] = await db.select({
    active: sql<number>`count(*) filter (where ${businessProSubscriptionsTable.status} = 'active')::int`,
    trialing: sql<number>`count(*) filter (where ${businessProSubscriptionsTable.status} = 'trialing')::int`,
    pastDue: sql<number>`count(*) filter (where ${businessProSubscriptionsTable.status} = 'past_due')::int`,
    canceled: sql<number>`count(*) filter (where ${businessProSubscriptionsTable.status} in ('canceled', 'expired'))::int`,
  }).from(businessProSubscriptionsTable);
  return {
    active: counts?.active ?? 0,
    trialing: counts?.trialing ?? 0,
    pastDue: counts?.pastDue ?? 0,
    canceled: counts?.canceled ?? 0,
    monthlyRecurringRevenueCents: (counts?.active ?? 0) * BUSINESS_PRO_PRICE_CENTS,
  };
}