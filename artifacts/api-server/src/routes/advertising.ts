import { clerkClient, getAuth } from "@clerk/express";
import * as v from "@workspace/api-zod";
import {
  adApprovalRecordsTable, adEventsTable, adTransactionsTable, advertisementsTable, advertisersTable,
  adGroupsTable, adPromotionRequestsTable, adSpendLedgerTable, advertisingAuditLogsTable, advertisingSettingsTable,
  campaignsTable, creativesTable, db,
} from "@workspace/db";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getBillingProvider } from "../lib/ad-billing";

const router: IRouter = Router();
const placements = ["home_feed", "following_feed", "search", "trending", "profile", "clips", "right_rail"] as const;
type Placement = (typeof placements)[number];
type Targeting = { geographies?: string[]; languages?: string[]; devices?: string[]; interests?: string[]; categories?: string[]; keywords?: string[]; exclusions?: string[] };
type ViewerContext = { geography?: string; language?: string; device?: string; interests: string[]; categories: string[]; keywords: string[] };
const now = () => new Date();
const stamp = (value: Date | null) => value?.toISOString() ?? null;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
type DeliveryTokenPayload = { adId: string; placement: Placement; sessionId: string; tokenId: string; expiresAt: number };

function createDeliveryToken(payload: DeliveryTokenPayload): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}
function verifyDeliveryToken(token: string): DeliveryTokenPayload | null {
  const secret = process.env.SESSION_SECRET;
  const [encoded, signature] = token.split(".");
  if (!secret || !encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DeliveryTokenPayload;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch { return null; }
}
async function admin(req: Request): Promise<string | null> {
  const { userId } = getAuth(req);
  if (!userId) return null;
  try {
    const user = await clerkClient.users.getUser(userId);
    const metadata = user.publicMetadata as Record<string, unknown>;
    return metadata.role === "admin" || metadata.isAdmin === true ? userId : null;
  } catch { return null; }
}
function isHttpUrl(value: string | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}
function normalizedList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean) : [];
}
function targeting(value: unknown): Targeting {
  const source = object(value);
  return {
    geographies: normalizedList(source.geographies), languages: normalizedList(source.languages),
    devices: normalizedList(source.devices), interests: normalizedList(source.interests),
    categories: normalizedList(source.categories), keywords: normalizedList(source.keywords),
    exclusions: normalizedList(source.exclusions),
  };
}
function csv(value: unknown): string[] {
  return typeof value === "string" ? value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) : [];
}
function viewerContext(req: Request, query: Record<string, unknown>): ViewerContext {
  const userAgent = String(req.headers["user-agent"] ?? "").toLowerCase();
  const inferredDevice = /ipad|tablet/.test(userAgent) ? "tablet" : /mobile|android|iphone/.test(userAgent) ? "mobile" : "desktop";
  const headerLanguage = String(req.headers["accept-language"] ?? "").split(",")[0]?.trim();
  const headerGeography = req.headers["x-country-code"] ?? req.headers["cf-ipcountry"];
  return {
    geography: String(query.geography ?? headerGeography ?? "").trim().toLowerCase() || undefined,
    language: String(query.language ?? headerLanguage ?? "").trim().toLowerCase() || undefined,
    device: String(query.device ?? inferredDevice).trim().toLowerCase() || undefined,
    interests: csv(query.interests), categories: csv(query.categories), keywords: csv(query.keywords),
  };
}
function matchesTargeting(value: unknown, context: ViewerContext): boolean {
  const rules = targeting(value);
  const includes = (required: string[] | undefined, actual: string | undefined) => !required?.length || Boolean(actual && required.includes(actual));
  const includesLanguage = (required: string[] | undefined, actual: string | undefined) => !required?.length || Boolean(actual && required.some((language) => actual === language || actual.startsWith(`${language}-`)));
  const intersects = (required: string[] | undefined, actual: string[]) => !required?.length || actual.some((item) => required.includes(item));
  const signals = [context.geography, context.language, context.device, ...context.interests, ...context.categories, ...context.keywords].filter(Boolean) as string[];
  return includes(rules.geographies, context.geography) && includesLanguage(rules.languages, context.language)
    && includes(rules.devices, context.device) && intersects(rules.interests, context.interests)
    && intersects(rules.categories, context.categories) && intersects(rules.keywords, context.keywords)
    && !normalizedList(rules.exclusions).some((item) => signals.includes(item));
}
function eventCharge(pricingModel: string, bidAmount: string | null, eventType: string): number {
  const bid = Number(bidAmount ?? 0);
  if (!Number.isFinite(bid) || bid <= 0) return 0;
  if (pricingModel === "cpm" && eventType === "impression") return bid / 1000;
  if (pricingModel === "cpc" && eventType === "click") return bid;
  if (pricingModel === "cpv" && eventType === "video_view") return bid;
  return 0;
}
async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const actor = await admin(req);
  if (!actor) res.status(403).json({ error: "Admin access is required." });
  return actor;
}
async function audit(actor: string, action: string, entityType: string, entityId?: string | null, reason?: string | null, details: Record<string, unknown> = {}) {
  await db.insert(advertisingAuditLogsTable).values({ actorClerkId: actor, action, entityType, entityId: entityId ?? null, reason: reason ?? null, details });
}
const advertiserPayload = (row: typeof advertisersTable.$inferSelect) => ({ ...row, ownerClerkId: row.ownerClerkId ?? null, contactEmail: row.contactEmail ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const campaignPayload = (row: typeof campaignsTable.$inferSelect) => ({ ...row, placements: Array.isArray(row.placements) ? row.placements as string[] : [], targeting: targeting(row.targeting), dailyBudget: row.dailyBudget === null ? null : Number(row.dailyBudget), totalBudget: row.totalBudget === null ? null : Number(row.totalBudget), bidAmount: row.bidAmount === null ? null : Number(row.bidAmount), spentAmount: Number(row.spentAmount), startsAt: stamp(row.startsAt), endsAt: stamp(row.endsAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const adGroupPayload = (row: typeof adGroupsTable.$inferSelect) => ({ ...row, targeting: targeting(row.targeting), frequencyCap: row.frequencyCap ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const creativePayload = (row: typeof creativesTable.$inferSelect) => ({ ...row, mediaUrl: row.mediaUrl ?? null, destinationUrl: row.destinationUrl ?? null, metadata: object(row.metadata), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const promotionPayload = (row: typeof adPromotionRequestsTable.$inferSelect) => ({ ...row, campaignId: row.campaignId ?? null, eligibility: object(row.eligibility), budget: row.budget === null ? null : Number(row.budget), startsAt: stamp(row.startsAt), endsAt: stamp(row.endsAt), reviewedByClerkId: row.reviewedByClerkId ?? null, reviewedAt: stamp(row.reviewedAt), reviewReason: row.reviewReason ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const advertisementPayload = (row: typeof advertisementsTable.$inferSelect) => ({ ...row, adGroupId: row.adGroupId ?? null, creativeId: row.creativeId ?? null, mediaUrl: row.mediaUrl ?? null, destinationUrl: row.destinationUrl ?? null, targeting: targeting(row.targeting), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const auditPayload = (row: typeof advertisingAuditLogsTable.$inferSelect) => ({ ...row, entityId: row.entityId ?? null, reason: row.reason ?? null, actorClerkId: row.actorClerkId ?? null, createdAt: row.createdAt.toISOString() });
const transactionPayload = (row: typeof adTransactionsTable.$inferSelect) => ({
  id: row.id, advertiserId: row.advertiserId ?? null, campaignId: row.campaignId ?? null, provider: row.provider,
  providerTransactionId: row.providerTransactionId, transactionType: row.transactionType, status: row.status,
  amountMinor: row.amountMinor, refundedAmountMinor: row.refundedAmountMinor, currency: row.currency,
  invoiceUrl: row.invoiceUrl ?? null, providerCreatedAt: stamp(row.providerCreatedAt), createdAt: row.createdAt.toISOString(),
});
function page<T>(items: T[], pageNumber: number, limit: number) {
  return { items: items.slice((pageNumber - 1) * limit, pageNumber * limit), page: pageNumber, limit, total: items.length, hasMore: pageNumber * limit < items.length };
}
function requireBillingProvider(res: Response): "stripe" | null {
  const provider = getBillingProvider();
  if (!provider) res.status(503).json({ error: "Approved billing provider is not connected." });
  return provider;
}
function financialBalances(rows: (typeof adTransactionsTable.$inferSelect)[]) {
  const balances = new Map<string, { currency: string; grossAmountMinor: number; refundedAmountMinor: number; netAmountMinor: number; settledTransactionCount: number }>();
  for (const row of rows.filter((item) => ["settled", "partially_refunded", "refunded"].includes(item.status))) {
    const balance = balances.get(row.currency) ?? { currency: row.currency, grossAmountMinor: 0, refundedAmountMinor: 0, netAmountMinor: 0, settledTransactionCount: 0 };
    balance.grossAmountMinor += row.amountMinor;
    balance.refundedAmountMinor += row.refundedAmountMinor;
    balance.netAmountMinor = balance.grossAmountMinor - balance.refundedAmountMinor;
    balance.settledTransactionCount += 1;
    balances.set(row.currency, balance);
  }
  return Array.from(balances.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}

router.get("/admin/advertising/overview", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const [advertisers, campaigns, active, events, activity] = await Promise.all([
    db.select({ value: count() }).from(advertisersTable),
    db.select({ value: count() }).from(campaignsTable),
    db.select({ value: count() }).from(advertisementsTable).where(eq(advertisementsTable.status, "active")),
    db.select({ value: count() }).from(adEventsTable).where(gte(adEventsTable.occurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
    db.select().from(advertisingAuditLogsTable).orderBy(desc(advertisingAuditLogsTable.createdAt)).limit(20),
  ]);
  res.json(v.GetAdminAdvertisingOverviewResponse.parse({ advertiserCount: advertisers[0]?.value ?? 0, campaignCount: campaigns[0]?.value ?? 0, activeAdvertisementCount: active[0]?.value ?? 0, eventCount: events[0]?.value ?? 0, series: [], activity: activity.map(auditPayload), billingIntegrationAvailable: getBillingProvider() !== null }));
});

router.get("/admin/advertising/advertisers", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminAdvertisersQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(advertisersTable).orderBy(desc(advertisersTable.createdAt));
  const filtered = rows.filter((x) => (!parsed.data.status || x.status === parsed.data.status) && (!parsed.data.search || `${x.name} ${x.contactEmail ?? ""}`.toLowerCase().includes(parsed.data.search.toLowerCase())));
  res.json(v.ListAdminAdvertisersResponse.parse(page(filtered.map(advertiserPayload), parsed.data.page, parsed.data.limit)));
});
router.post("/admin/advertising/advertisers", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.CreateAdminAdvertiserBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "Invalid advertiser." });
  const [row] = await db.insert(advertisersTable).values({ name: body.data.name.trim(), ownerClerkId: body.data.ownerClerkId, contactEmail: body.data.contactEmail }).returning();
  await audit(actor, "advertiser_created", "advertiser", row.id);
  res.status(201).json(v.CreateAdminAdvertiserResponse.parse(advertiserPayload(row)));
});
router.patch("/admin/advertising/advertisers/:id/status", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.UpdateAdminAdvertiserStatusParams.safeParse(req.params), body = v.UpdateAdminAdvertiserStatusBody.safeParse(req.body);
  if (!params.success || !body.success || (["suspended", "paused"].includes(body.data.status) && !body.data.reason)) return void res.status(400).json({ error: "A reason is required for this status change." });
  const [row] = await db.update(advertisersTable).set({ status: body.data.status, updatedAt: now() }).where(eq(advertisersTable.id, params.data.id)).returning();
  if (!row) return void res.status(404).json({ error: "Advertiser not found." });
  await audit(actor, "advertiser_status_updated", "advertiser", row.id, body.data.reason);
  res.json(v.UpdateAdminAdvertiserStatusResponse.parse(advertiserPayload(row)));
});

router.get("/admin/advertising/campaigns", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminCampaignsQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt));
  const filtered = rows.filter((x) => (!parsed.data.status || x.status === parsed.data.status) && (!parsed.data.search || x.name.toLowerCase().includes(parsed.data.search.toLowerCase())));
  res.json(v.ListAdminCampaignsResponse.parse(page(filtered.map(campaignPayload), parsed.data.page, parsed.data.limit)));
});
router.post("/admin/advertising/campaigns", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.CreateAdminCampaignBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "Invalid campaign." });
  const config = settingsPayload(await settings()); if (!config.enabled || config.emergencyShutdown) return void res.status(409).json({ error: "Advertising creation is disabled by platform settings." });
  const [advertiser] = await db.select({ id: advertisersTable.id }).from(advertisersTable).where(eq(advertisersTable.id, body.data.advertiserId)); if (!advertiser) return void res.status(404).json({ error: "Advertiser not found." });
  const [row] = await db.insert(campaignsTable).values({ ...body.data, name: body.data.name.trim(), targeting: body.data.targeting ?? {}, dailyBudget: body.data.dailyBudget?.toString(), totalBudget: body.data.totalBudget?.toString(), bidAmount: body.data.bidAmount?.toString(), startsAt: body.data.startsAt ? new Date(body.data.startsAt) : null, endsAt: body.data.endsAt ? new Date(body.data.endsAt) : null }).returning();
  await audit(actor, "campaign_created", "campaign", row.id);
  res.status(201).json(v.CreateAdminCampaignResponse.parse(campaignPayload(row)));
});
router.patch("/admin/advertising/campaigns/:id/status", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.UpdateAdminCampaignStatusParams.safeParse(req.params), body = v.UpdateAdminCampaignStatusBody.safeParse(req.body);
  if (!params.success || !body.success || !["draft", "active", "paused"].includes(body.data.status) || !body.data.reason) return void res.status(400).json({ error: "A valid campaign status and audit reason are required." });
  if (body.data.status === "active") {
    const config = settingsPayload(await settings());
    if (!config.enabled || config.emergencyShutdown) return void res.status(409).json({ error: "Campaign activation is disabled by platform settings." });
  }
  const [row] = await db.update(campaignsTable).set({ status: body.data.status, updatedAt: now() }).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!row) return void res.status(404).json({ error: "Campaign not found." });
  await audit(actor, "campaign_status_updated", "campaign", row.id, body.data.reason, { status: body.data.status });
  res.json(v.UpdateAdminCampaignStatusResponse.parse(campaignPayload(row)));
});
router.patch("/admin/advertising/campaigns/:id", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.UpdateAdminCampaignParams.safeParse(req.params), body = v.UpdateAdminCampaignBody.safeParse(req.body);
  if (!params.success || !body.success || !Object.keys(body.data).length) return void res.status(400).json({ error: "Valid campaign controls are required." });
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${params.data.id}))`);
    const [current] = await tx.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id)).limit(1);
    if (!current) return { row: null, error: null };
    const daily = body.data.dailyBudget === undefined ? (current.dailyBudget === null ? null : Number(current.dailyBudget)) : body.data.dailyBudget;
    const total = body.data.totalBudget === undefined ? (current.totalBudget === null ? null : Number(current.totalBudget)) : body.data.totalBudget;
    if (daily !== null && total !== null && daily > total) return { row: null, error: "Daily budget cannot exceed total budget." };
    if (total !== null && total < Number(current.spentAmount)) return { row: null, error: "Total budget cannot be lower than recorded spend." };
    const [row] = await tx.update(campaignsTable).set({
      ...body.data,
      name: body.data.name?.trim(),
      dailyBudget: body.data.dailyBudget === undefined ? undefined : body.data.dailyBudget === null ? null : body.data.dailyBudget.toString(),
      totalBudget: body.data.totalBudget === undefined ? undefined : body.data.totalBudget === null ? null : body.data.totalBudget.toString(),
      bidAmount: body.data.bidAmount === undefined ? undefined : body.data.bidAmount === null ? null : body.data.bidAmount.toString(),
      startsAt: body.data.startsAt === undefined ? undefined : body.data.startsAt === null ? null : new Date(body.data.startsAt),
      endsAt: body.data.endsAt === undefined ? undefined : body.data.endsAt === null ? null : new Date(body.data.endsAt),
      updatedAt: now(),
    }).where(eq(campaignsTable.id, params.data.id)).returning();
    return { row, error: null };
  });
  if (result.error) return void res.status(400).json({ error: result.error });
  const row = result.row;
  if (!row) return void res.status(404).json({ error: "Campaign not found." });
  await audit(actor, "campaign_controls_updated", "campaign", row.id, null, { pricingModel: row.pricingModel });
  res.json(v.UpdateAdminCampaignResponse.parse(campaignPayload(row)));
});

router.get("/admin/advertising/ad-groups", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminAdGroupsQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(adGroupsTable).orderBy(desc(adGroupsTable.createdAt));
  const filtered = rows.filter((row) => (!parsed.data.status || row.status === parsed.data.status) && (!parsed.data.campaignId || row.campaignId === parsed.data.campaignId) && (!parsed.data.search || row.name.toLowerCase().includes(parsed.data.search.toLowerCase())));
  res.json(v.ListAdminAdGroupsResponse.parse(page(filtered.map(adGroupPayload), parsed.data.page, parsed.data.limit)));
});
router.post("/admin/advertising/ad-groups", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.CreateAdminAdGroupBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "Invalid ad group or targeting controls." });
  const [campaign] = await db.select({ id: campaignsTable.id }).from(campaignsTable).where(eq(campaignsTable.id, body.data.campaignId));
  if (!campaign) return void res.status(404).json({ error: "Campaign not found." });
  const [row] = await db.insert(adGroupsTable).values({ ...body.data, name: body.data.name.trim(), targeting: body.data.targeting ?? {} }).returning();
  await audit(actor, "ad_group_created", "ad_group", row.id);
  res.status(201).json(v.CreateAdminAdGroupResponse.parse(adGroupPayload(row)));
});
router.patch("/admin/advertising/ad-groups/:id", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.UpdateAdminAdGroupParams.safeParse(req.params), body = v.UpdateAdminAdGroupBody.safeParse(req.body);
  if (!params.success || !body.success || !Object.keys(body.data).length) return void res.status(400).json({ error: "Invalid ad group update." });
  const [row] = await db.update(adGroupsTable).set({ ...body.data, name: body.data.name?.trim(), updatedAt: now() }).where(eq(adGroupsTable.id, params.data.id)).returning();
  if (!row) return void res.status(404).json({ error: "Ad group not found." });
  await audit(actor, "ad_group_updated", "ad_group", row.id);
  res.json(v.UpdateAdminAdGroupResponse.parse(adGroupPayload(row)));
});
router.delete("/admin/advertising/ad-groups/:id", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.DeleteAdminAdGroupParams.safeParse(req.params); if (!params.success) return void res.status(400).json({ error: "Invalid ad group." });
  const [linked] = await db.select({ value: count() }).from(advertisementsTable).where(eq(advertisementsTable.adGroupId, params.data.id));
  if ((linked?.value ?? 0) > 0) return void res.status(409).json({ error: "Pause the group instead; linked advertisements prevent deletion." });
  const [row] = await db.delete(adGroupsTable).where(eq(adGroupsTable.id, params.data.id)).returning({ id: adGroupsTable.id });
  if (!row) return void res.status(404).json({ error: "Ad group not found." });
  await audit(actor, "ad_group_deleted", "ad_group", row.id);
  res.sendStatus(204);
});

router.get("/admin/advertising/creatives", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminCreativesQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(creativesTable).orderBy(desc(creativesTable.createdAt));
  const filtered = rows.filter((row) => (!parsed.data.status || row.status === parsed.data.status) && (!parsed.data.advertiserId || row.advertiserId === parsed.data.advertiserId) && (!parsed.data.search || `${row.name} ${row.headline}`.toLowerCase().includes(parsed.data.search.toLowerCase())));
  res.json(v.ListAdminCreativesResponse.parse(page(filtered.map(creativePayload), parsed.data.page, parsed.data.limit)));
});
router.post("/admin/advertising/creatives", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.CreateAdminCreativeBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "Invalid creative." });
  if (!isHttpUrl(body.data.mediaUrl ?? undefined) || !isHttpUrl(body.data.destinationUrl ?? undefined)) return void res.status(400).json({ error: "Media and destination URLs must be absolute HTTP(S) URLs." });
  const [advertiser] = await db.select({ id: advertisersTable.id }).from(advertisersTable).where(eq(advertisersTable.id, body.data.advertiserId));
  if (!advertiser) return void res.status(404).json({ error: "Advertiser not found." });
  const [row] = await db.insert(creativesTable).values({ ...body.data, name: body.data.name.trim(), headline: body.data.headline.trim(), body: body.data.body ?? "", mediaUrl: body.data.mediaUrl ?? null, destinationUrl: body.data.destinationUrl ?? null, metadata: body.data.metadata ?? {} }).returning();
  await audit(actor, "creative_created", "creative", row.id);
  res.status(201).json(v.CreateAdminCreativeResponse.parse(creativePayload(row)));
});
router.patch("/admin/advertising/creatives/:id", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.UpdateAdminCreativeParams.safeParse(req.params), body = v.UpdateAdminCreativeBody.safeParse(req.body);
  if (!params.success || !body.success || !Object.keys(body.data).length) return void res.status(400).json({ error: "Invalid creative update." });
  if (!isHttpUrl(body.data.mediaUrl ?? undefined) || !isHttpUrl(body.data.destinationUrl ?? undefined)) return void res.status(400).json({ error: "Media and destination URLs must be absolute HTTP(S) URLs." });
  const [row] = await db.update(creativesTable).set({ ...body.data, name: body.data.name?.trim(), headline: body.data.headline?.trim(), updatedAt: now() }).where(eq(creativesTable.id, params.data.id)).returning();
  if (!row) return void res.status(404).json({ error: "Creative not found." });
  await audit(actor, "creative_updated", "creative", row.id);
  res.json(v.UpdateAdminCreativeResponse.parse(creativePayload(row)));
});
router.delete("/admin/advertising/creatives/:id", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.DeleteAdminCreativeParams.safeParse(req.params); if (!params.success) return void res.status(400).json({ error: "Invalid creative." });
  const [linked] = await db.select({ value: count() }).from(advertisementsTable).where(eq(advertisementsTable.creativeId, params.data.id));
  if ((linked?.value ?? 0) > 0) return void res.status(409).json({ error: "Archive the creative instead; linked advertisements prevent deletion." });
  const [row] = await db.delete(creativesTable).where(eq(creativesTable.id, params.data.id)).returning({ id: creativesTable.id });
  if (!row) return void res.status(404).json({ error: "Creative not found." });
  await audit(actor, "creative_deleted", "creative", row.id);
  res.sendStatus(204);
});

router.get("/admin/advertising/promotions", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminPromotionsQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(adPromotionRequestsTable).orderBy(desc(adPromotionRequestsTable.createdAt));
  const filtered = rows.filter((row) => (!parsed.data.status || row.status === parsed.data.status) && (!parsed.data.type || row.type === parsed.data.type));
  res.json(v.ListAdminPromotionsResponse.parse(page(filtered.map(promotionPayload), parsed.data.page, parsed.data.limit)));
});
router.post("/admin/advertising/promotions", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.CreateAdminPromotionBody.safeParse(req.body); if (!body.success || !Object.keys(body.data.eligibility).length) return void res.status(400).json({ error: "Promotion eligibility criteria are required." });
  const [advertiser] = await db.select({ id: advertisersTable.id }).from(advertisersTable).where(eq(advertisersTable.id, body.data.advertiserId));
  if (!advertiser) return void res.status(404).json({ error: "Advertiser not found." });
  if (body.data.campaignId) {
    const [campaign] = await db.select({ advertiserId: campaignsTable.advertiserId }).from(campaignsTable).where(eq(campaignsTable.id, body.data.campaignId));
    if (!campaign) return void res.status(400).json({ error: "Promotion campaign not found." });
    if (campaign.advertiserId !== body.data.advertiserId) return void res.status(400).json({ error: "Promotion campaign must belong to the selected advertiser." });
  }
  const [row] = await db.insert(adPromotionRequestsTable).values({ ...body.data, campaignId: body.data.campaignId ?? null, name: body.data.name.trim(), description: body.data.description ?? "", budget: body.data.budget?.toString() ?? null, startsAt: body.data.startsAt ? new Date(body.data.startsAt) : null, endsAt: body.data.endsAt ? new Date(body.data.endsAt) : null }).returning();
  await audit(actor, "promotion_submitted", "promotion", row.id, null, { type: row.type });
  res.status(201).json(v.CreateAdminPromotionResponse.parse(promotionPayload(row)));
});
router.post("/admin/advertising/promotions/:id/review", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.ReviewAdminPromotionParams.safeParse(req.params), body = v.ReviewAdminPromotionBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: "A valid decision and audit reason are required." });
  const status = body.data.action === "approve" || body.data.action === "resume" ? "approved" : body.data.action === "pause" ? "paused" : "rejected";
  const [row] = await db.update(adPromotionRequestsTable).set({ status, reviewedByClerkId: actor, reviewedAt: now(), reviewReason: body.data.reason, updatedAt: now() }).where(eq(adPromotionRequestsTable.id, params.data.id)).returning();
  if (!row) return void res.status(404).json({ error: "Promotion not found." });
  await audit(actor, `promotion_${body.data.action}`, "promotion", row.id, body.data.reason, { type: row.type });
  res.json(v.ReviewAdminPromotionResponse.parse(promotionPayload(row)));
});

router.get("/admin/advertising/advertisements", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminAdvertisementsQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(advertisementsTable).orderBy(desc(advertisementsTable.createdAt));
  const filtered = rows.filter((x) => (!parsed.data.status || x.status === parsed.data.status) && (!parsed.data.search || `${x.name} ${x.headline}`.toLowerCase().includes(parsed.data.search.toLowerCase())));
  res.json(v.ListAdminAdvertisementsResponse.parse(page(filtered.map(advertisementPayload), parsed.data.page, parsed.data.limit)));
});
router.post("/admin/advertising/advertisements", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.CreateAdminAdvertisementBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "Invalid advertisement." });
  if (!isHttpUrl(body.data.mediaUrl) || !isHttpUrl(body.data.destinationUrl)) return void res.status(400).json({ error: "Media and destination URLs must be absolute HTTP(S) URLs." });
  const config = settingsPayload(await settings()); if (!config.enabled || config.emergencyShutdown) return void res.status(409).json({ error: "Advertising creation is disabled by platform settings." });
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, body.data.campaignId)); if (!campaign) return void res.status(404).json({ error: "Campaign not found." });
  const [group] = body.data.adGroupId ? await db.select().from(adGroupsTable).where(eq(adGroupsTable.id, body.data.adGroupId)) : [];
  if (body.data.adGroupId && (!group || group.campaignId !== campaign.id)) return void res.status(400).json({ error: "Ad group must belong to the selected campaign." });
  const [creative] = body.data.creativeId ? await db.select().from(creativesTable).where(eq(creativesTable.id, body.data.creativeId)) : [];
  if (body.data.creativeId && (!creative || creative.advertiserId !== campaign.advertiserId || creative.status !== "active")) return void res.status(400).json({ error: "Creative must be active and belong to the campaign advertiser." });
  const [row] = await db.insert(advertisementsTable).values({
    ...body.data, name: body.data.name.trim(), status: "pending_approval", targeting: body.data.targeting ?? {},
    headline: (creative?.headline ?? body.data.headline).trim(), body: creative?.body ?? body.data.body ?? "",
    mediaUrl: creative?.mediaUrl ?? body.data.mediaUrl, destinationUrl: creative?.destinationUrl ?? body.data.destinationUrl,
  }).returning();
  await db.insert(adApprovalRecordsTable).values({ advertisementId: row.id, action: "submitted" });
  await audit(actor, "advertisement_created", "advertisement", row.id);
  res.status(201).json(v.CreateAdminAdvertisementResponse.parse(advertisementPayload(row)));
});
router.post("/admin/advertising/advertisements/:id/review", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const params = v.ReviewAdminAdvertisementParams.safeParse(req.params), body = v.ReviewAdminAdvertisementBody.safeParse(req.body);
  if (!params.success || !body.success || (body.data.action !== "approve" && !body.data.reason)) return void res.status(400).json({ error: "A reason is required for this review action." });
  const status = body.data.action === "approve" || body.data.action === "resume" ? "active" : body.data.action === "pause" ? "paused" : body.data.action;
  const [row] = await db.update(advertisementsTable).set({ status, updatedAt: now() }).where(eq(advertisementsTable.id, params.data.id)).returning();
  if (!row) return void res.status(404).json({ error: "Advertisement not found." });
  await db.insert(adApprovalRecordsTable).values({ advertisementId: row.id, action: body.data.action, reason: body.data.reason, reviewerClerkId: actor });
  await audit(actor, `advertisement_${body.data.action}`, "advertisement", row.id, body.data.reason);
  res.json(v.ReviewAdminAdvertisementResponse.parse(advertisementPayload(row)));
});

async function settings() {
  const [row] = await db.select().from(advertisingSettingsTable).where(eq(advertisingSettingsTable.id, "singleton"));
  return row;
}
const settingsPayload = (row: typeof advertisingSettingsTable.$inferSelect | undefined) => ({ enabled: row?.enabled ?? true, emergencyShutdown: row?.emergencyShutdown ?? false, placementSettings: object(row?.placementSettings), frequencySettings: object(row?.frequencySettings), featureFlags: object(row?.featureFlags), billingIntegrationAvailable: getBillingProvider() !== null, updatedAt: row?.updatedAt.toISOString() ?? new Date(0).toISOString() });
router.get("/admin/advertising/settings", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  res.json(v.GetAdminAdvertisingSettingsResponse.parse(settingsPayload(await settings())));
});
router.patch("/admin/advertising/settings", async (req, res): Promise<void> => {
  const actor = await requireAdmin(req, res); if (!actor) return;
  const body = v.UpdateAdminAdvertisingSettingsBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "A reason is required for settings updates." });
  const current = await settings();
  const values = { id: "singleton", enabled: body.data.enabled ?? current?.enabled ?? true, emergencyShutdown: body.data.emergencyShutdown ?? current?.emergencyShutdown ?? false, placementSettings: body.data.placementSettings ?? object(current?.placementSettings), frequencySettings: body.data.frequencySettings ?? object(current?.frequencySettings), featureFlags: body.data.featureFlags ?? object(current?.featureFlags), updatedByClerkId: actor, updatedAt: now() };
  const [row] = await db.insert(advertisingSettingsTable).values(values).onConflictDoUpdate({ target: advertisingSettingsTable.id, set: values }).returning();
  await audit(actor, values.emergencyShutdown ? "emergency_shutdown_updated" : "settings_updated", "settings", "singleton", body.data.reason);
  res.json(v.UpdateAdminAdvertisingSettingsResponse.parse(settingsPayload(row)));
});
router.get("/admin/advertising/audit", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const parsed = v.ListAdminAdvertisingAuditQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(advertisingAuditLogsTable).orderBy(desc(advertisingAuditLogsTable.createdAt));
  res.json(v.ListAdminAdvertisingAuditResponse.parse(page(rows.map(auditPayload), parsed.data.page, parsed.data.limit)));
});

router.get("/admin/advertising/billing", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const provider = requireBillingProvider(res); if (!provider) return;
  const rows = await db.select().from(adTransactionsTable).where(eq(adTransactionsTable.provider, provider)).orderBy(desc(adTransactionsTable.createdAt));
  res.json(v.GetAdminAdvertisingBillingResponse.parse({ provider, balances: financialBalances(rows), transactionCount: rows.length, available: true }));
});
router.get("/admin/advertising/transactions", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const provider = requireBillingProvider(res); if (!provider) return;
  const parsed = v.ListAdminAdvertisingTransactionsQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid query." });
  const rows = await db.select().from(adTransactionsTable).where(eq(adTransactionsTable.provider, provider)).orderBy(desc(adTransactionsTable.createdAt));
  const filtered = parsed.data.status ? rows.filter((row) => row.status === parsed.data.status) : rows;
  res.json(v.ListAdminAdvertisingTransactionsResponse.parse(page(filtered.map(transactionPayload), parsed.data.page, parsed.data.limit)));
});
router.get("/admin/advertising/revenue", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const provider = requireBillingProvider(res); if (!provider) return;
  const rows = await db.select().from(adTransactionsTable).where(eq(adTransactionsTable.provider, provider)).orderBy(desc(adTransactionsTable.createdAt));
  res.json(v.GetAdminAdvertisingRevenueResponse.parse({ provider, balances: financialBalances(rows), available: true }));
});

router.get("/advertising/placement", async (req, res): Promise<void> => {
  const parsed = v.GetAdPlacementQueryParams.safeParse(req.query); if (!parsed.success) return void res.status(400).json({ error: "Invalid placement request." });
  const placement = parsed.data.placement as Placement, config = settingsPayload(await settings()), context = viewerContext(req, parsed.data);
  if (!config.enabled || config.emergencyShutdown || object(config.featureFlags).advertisingEnabled === false || object(config.placementSettings)[placement] === false) return void res.json(v.GetAdPlacementResponse.parse({ ad: null }));
  const delivery = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${parsed.data.sessionId}))`);
    const configuredCap = Number(object(config.frequencySettings).maxImpressionsPerSession);
    if (Number.isFinite(configuredCap) && configuredCap > 0) {
      const [seen] = await tx.select({ value: count() }).from(adEventsTable).where(and(eq(adEventsTable.sessionId, parsed.data.sessionId), eq(adEventsTable.eventType, "delivery")));
      if ((seen?.value ?? 0) >= configuredCap) return null;
    }
    const rows = await tx.select({ ad: advertisementsTable, campaign: campaignsTable, advertiser: advertisersTable, group: adGroupsTable }).from(advertisementsTable).innerJoin(campaignsTable, eq(advertisementsTable.campaignId, campaignsTable.id)).innerJoin(advertisersTable, eq(campaignsTable.advertiserId, advertisersTable.id)).leftJoin(adGroupsTable, eq(advertisementsTable.adGroupId, adGroupsTable.id)).where(and(eq(advertisementsTable.status, "active"), eq(advertisementsTable.placement, placement), eq(campaignsTable.status, "active"), eq(advertisersTable.status, "active")));
    const scheduled = rows.filter(({ ad, campaign, group }) => (!campaign.startsAt || campaign.startsAt <= now()) && (!campaign.endsAt || campaign.endsAt >= now()) && (Array.isArray(campaign.placements) && campaign.placements.includes(placement)) && (!group || group.status === "active") && matchesTargeting(campaign.targeting, context) && (!group || matchesTargeting(group.targeting, context)) && matchesTargeting(ad.targeting, context) && (campaign.totalBudget === null || Number(campaign.spentAmount) < Number(campaign.totalBudget)));
    let candidate: (typeof scheduled)[number] | undefined;
    for (const item of scheduled) {
      if (item.ad.frequencyCap) {
        const [seen] = await tx.select({ value: count() }).from(adEventsTable).where(and(eq(adEventsTable.advertisementId, item.ad.id), eq(adEventsTable.sessionId, parsed.data.sessionId), eq(adEventsTable.eventType, "delivery")));
        if ((seen?.value ?? 0) >= item.ad.frequencyCap) continue;
      }
      if (item.group?.frequencyCap) {
        const [seen] = await tx.select({ value: count() }).from(adEventsTable).innerJoin(advertisementsTable, eq(adEventsTable.advertisementId, advertisementsTable.id)).where(and(eq(advertisementsTable.adGroupId, item.group.id), eq(adEventsTable.sessionId, parsed.data.sessionId), eq(adEventsTable.eventType, "delivery")));
        if ((seen?.value ?? 0) >= item.group.frequencyCap) continue;
      }
      if (item.campaign.dailyBudget !== null) {
        const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
        const [daily] = await tx.select({ value: sql<number>`coalesce(sum(${adSpendLedgerTable.amount}), 0)` }).from(adSpendLedgerTable).where(and(eq(adSpendLedgerTable.campaignId, item.campaign.id), gte(adSpendLedgerTable.occurredAt, dayStart)));
        if (Number(daily?.value ?? 0) >= Number(item.campaign.dailyBudget)) continue;
      }
      const [review] = await tx.select({ action: adApprovalRecordsTable.action }).from(adApprovalRecordsTable).where(and(eq(adApprovalRecordsTable.advertisementId, item.ad.id), eq(adApprovalRecordsTable.action, "approve"))).limit(1);
      if (review) { candidate = item; break; }
    }
    if (!candidate) return null;
    const tokenId = randomUUID();
    const deliveryToken = createDeliveryToken({ adId: candidate.ad.id, placement, sessionId: parsed.data.sessionId, tokenId, expiresAt: Date.now() + 15 * 60 * 1000 });
    if (!deliveryToken) throw new Error("Advertising signing is unavailable.");
    await tx.insert(adEventsTable).values({ advertisementId: candidate.ad.id, eventType: "delivery", placement, sessionId: parsed.data.sessionId, deliveryTokenId: tokenId });
    return { candidate, deliveryToken };
  });
  if (!delivery) return void res.json(v.GetAdPlacementResponse.parse({ ad: null }));
  const { candidate, deliveryToken } = delivery;
  res.json(v.GetAdPlacementResponse.parse({ ad: { id: candidate.ad.id, advertiserId: candidate.advertiser.id, advertiserName: candidate.advertiser.name, campaignId: candidate.ad.campaignId, placement: candidate.ad.placement, headline: candidate.ad.headline, body: candidate.ad.body, mediaUrl: candidate.ad.mediaUrl ?? null, destinationUrl: candidate.ad.destinationUrl ?? null, paidLabel: "Sponsored", deliveryToken } }));
});
router.post("/advertising/events", async (req, res): Promise<void> => {
  const body = v.RecordAdEventBody.safeParse(req.body); if (!body.success) return void res.status(400).json({ error: "Invalid advertising event." });
  const token = verifyDeliveryToken(body.data.deliveryToken);
  if (!token || token.adId !== body.data.advertisementId || token.placement !== body.data.placement || token.sessionId !== body.data.sessionId) return void res.status(400).json({ error: "Invalid or expired delivery proof." });
  const [eligible] = await db.select({ ad: advertisementsTable, campaign: campaignsTable, advertiser: advertisersTable, group: adGroupsTable })
    .from(advertisementsTable).innerJoin(campaignsTable, eq(advertisementsTable.campaignId, campaignsTable.id))
    .innerJoin(advertisersTable, eq(campaignsTable.advertiserId, advertisersTable.id))
    .leftJoin(adGroupsTable, eq(advertisementsTable.adGroupId, adGroupsTable.id)).where(eq(advertisementsTable.id, body.data.advertisementId));
  const config = settingsPayload(await settings());
  const ad = eligible?.ad, campaign = eligible?.campaign, advertiser = eligible?.advertiser, group = eligible?.group;
  const isScheduled = campaign && (!campaign.startsAt || campaign.startsAt <= now()) && (!campaign.endsAt || campaign.endsAt >= now());
  if (!ad || !campaign || !advertiser || ad.status !== "active" || campaign.status !== "active" || advertiser.status !== "active" || (group && group.status !== "active") || ad.placement !== body.data.placement || !isScheduled || !config.enabled || config.emergencyShutdown || object(config.featureFlags).advertisingEnabled === false || object(config.placementSettings)[body.data.placement] === false) return void res.status(404).json({ error: "Eligible advertisement not found." });
  const [issued] = await db.select({ id: adEventsTable.id }).from(adEventsTable).where(and(eq(adEventsTable.deliveryTokenId, token.tokenId), eq(adEventsTable.eventType, "delivery"))).limit(1);
  if (!issued) return void res.status(400).json({ error: "Delivery proof was not issued by this server." });
  if (body.data.eventType !== "impression") {
    const [impression] = await db.select({ id: adEventsTable.id }).from(adEventsTable).where(and(eq(adEventsTable.deliveryTokenId, token.tokenId), eq(adEventsTable.eventType, "impression"))).limit(1);
    if (!impression) return void res.status(409).json({ error: "An accepted impression is required before this event." });
  }
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${campaign.id}))`);
    const [duplicate] = await tx.select({ id: adEventsTable.id }).from(adEventsTable).where(and(eq(adEventsTable.deliveryTokenId, token.tokenId), eq(adEventsTable.eventType, body.data.eventType))).limit(1);
    if (duplicate) return { rows: [], rejection: null };
    if (body.data.eventType === "impression" && body.data.sessionId) {
      if (ad.frequencyCap) {
        const [seen] = await tx.select({ value: count() }).from(adEventsTable).where(and(eq(adEventsTable.advertisementId, ad.id), eq(adEventsTable.sessionId, body.data.sessionId), eq(adEventsTable.eventType, "impression")));
        if ((seen?.value ?? 0) >= ad.frequencyCap) return { rows: [], rejection: "Advertisement frequency limit reached." };
      }
      if (group?.frequencyCap) {
        const [seen] = await tx.select({ value: count() }).from(adEventsTable).innerJoin(advertisementsTable, eq(adEventsTable.advertisementId, advertisementsTable.id)).where(and(eq(advertisementsTable.adGroupId, group.id), eq(adEventsTable.sessionId, body.data.sessionId), eq(adEventsTable.eventType, "impression")));
        if ((seen?.value ?? 0) >= group.frequencyCap) return { rows: [], rejection: "Ad group frequency limit reached." };
      }
    }
    const [lockedCampaign] = await tx.select().from(campaignsTable).where(eq(campaignsTable.id, campaign.id)).limit(1);
    const charge = eventCharge(lockedCampaign.pricingModel, lockedCampaign.bidAmount, body.data.eventType);
    if (charge > 0) {
      const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
      const [daily] = await tx.select({ value: sql<number>`coalesce(sum(${adSpendLedgerTable.amount}), 0)` }).from(adSpendLedgerTable).where(and(eq(adSpendLedgerTable.campaignId, campaign.id), gte(adSpendLedgerTable.occurredAt, dayStart)));
      if (lockedCampaign.totalBudget !== null && Number(lockedCampaign.spentAmount) + charge > Number(lockedCampaign.totalBudget)) return { rows: [], rejection: "Campaign total budget reached." };
      if (lockedCampaign.dailyBudget !== null && Number(daily?.value ?? 0) + charge > Number(lockedCampaign.dailyBudget)) return { rows: [], rejection: "Campaign daily budget reached." };
    }
    const rows = await tx.insert(adEventsTable).values({ advertisementId: ad.id, eventType: body.data.eventType, placement: body.data.placement, sessionId: body.data.sessionId, deliveryTokenId: token.tokenId }).onConflictDoNothing().returning({ id: adEventsTable.id });
    if (charge > 0) {
      await tx.insert(adSpendLedgerTable).values({ campaignId: campaign.id, advertisementId: ad.id, eventId: rows[0].id, pricingModel: lockedCampaign.pricingModel, billableEvent: body.data.eventType, bidAmount: lockedCampaign.bidAmount ?? "0", amount: charge.toFixed(4) });
      await tx.update(campaignsTable).set({ spentAmount: sql`${campaignsTable.spentAmount} + ${charge.toFixed(4)}`, updatedAt: now() }).where(eq(campaignsTable.id, campaign.id));
    }
    return { rows, rejection: null };
  });
  if (result.rejection) return void res.status(result.rejection.includes("frequency") ? 429 : 409).json({ error: result.rejection });
  res.status(201).json(v.RecordAdEventResponse.parse({ recorded: result.rows.length > 0 }));
});

export default router;