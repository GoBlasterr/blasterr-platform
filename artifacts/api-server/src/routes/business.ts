import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import {
  GetBusinessAnalyticsParams, GetBusinessAnalyticsResponse, GetBusinessCenterParams, GetBusinessCenterResponse,
  GetBusinessParams, GetBusinessResponse, ListBusinessesQueryParams, ListBusinessesResponse, SubmitBusinessClaimBody,
  SubmitBusinessClaimParams, SubmitBusinessClaimResponse, ToggleBusinessFollowParams, ToggleBusinessFollowResponse,
  CreateBusinessProfileBody, CreateBusinessProfileResponse, ListOwnedBusinessesResponse,
} from "@workspace/api-zod";
import { db, targetsTable } from "@workspace/db";
import * as social from "../lib/social-repository";
import * as business from "../lib/business-repository";
import { adminFeatureFlags, ensureAdminState } from "../lib/admin-state";

const router: IRouter = Router();

async function current(req: Parameters<typeof getAuth>[0]) {
  const { userId } = getAuth(req);
  return userId ? social.userByAuth(userId) : undefined;
}

function flagEnabled(key: string) {
  return adminFeatureFlags.find((flag) => flag.key === key)?.enabled ?? false;
}

function detailPayload(value: Awaited<ReturnType<typeof business.getBusinessBySlug>>) {
  if (!value) return null;
  return { ...value, blasts: value.blasts.map((blast) => ({ ...blast, createdAt: blast.createdAt.toISOString(), updatedAt: blast.updatedAt.toISOString() })) };
}

router.get("/business", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_section_enabled") || !flagEnabled("business_targets_enabled")) { res.status(404).json({ error: "Business discovery is not enabled." }); return; }
  const parsed = ListBusinessesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = await business.listBusinesses(parsed.data);
  res.json(ListBusinessesResponse.parse(result));
});

router.post("/business", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_targets_enabled") || !flagEnabled("new_target_requests")) {
    res.status(403).json({ error: "New Business Target requests are currently disabled." });
    return;
  }
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Sign in is required to create a business profile." }); return; }
  const viewer = await current(req);
  if (!viewer) { res.status(401).json({ error: "Complete your personal profile before creating a business profile." }); return; }
  const body = CreateBusinessProfileBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Enter valid business information." }); return; }
  if (!body.data.name.trim() || !body.data.location.trim() || !body.data.description.trim()) {
    res.status(400).json({ error: "Business name, location, and description are required." });
    return;
  }
  try {
    const created = await business.createOwnedBusinessTarget(body.data, viewer.id);
    if (created.conflict === "limit") {
      res.status(409).json({ error: `You can own up to ${business.ownedBusinessLimit} Business Target pages.` });
      return;
    }
    if (created.conflict === "duplicate") {
      res.status(409).json({ error: "A Business Target with this name and location already exists. Open that page to claim it instead." });
      return;
    }
    const detail = detailPayload(await business.getBusinessBySlug(created.target.slug));
    res.status(201).json(CreateBusinessProfileResponse.parse(detail));
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "A Business Target with this identity already exists. Open that page to claim it instead." });
      return;
    }
    req.log.error({ err: error, userId: viewer.id }, "Unable to create owned Business Target");
    res.status(500).json({ error: "Business profile could not be created. Please try again." });
  }
});

router.get("/business/mine", async (req, res): Promise<void> => {
  const viewer = await current(req);
  if (!viewer) { res.status(401).json({ error: "Sign in is required to view your business pages." }); return; }
  const items = await business.listOwnedBusinesses(viewer.id);
  res.json(ListOwnedBusinessesResponse.parse({
    items,
    limit: business.ownedBusinessLimit,
    canCreate: items.length < business.ownedBusinessLimit,
  }));
});

router.get("/business/:slug", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_section_enabled") || !flagEnabled("business_targets_enabled")) { res.status(404).json({ error: "Business discovery is not enabled." }); return; }
  const parsed = GetBusinessParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = detailPayload(await business.getBusinessBySlug(parsed.data.slug));
  if (!result) { res.status(404).json({ error: "Business Target not found." }); return; }
  res.json(GetBusinessResponse.parse(result));
});

router.post("/business/:targetId/follow", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_section_enabled") || !flagEnabled("business_targets_enabled")) { res.status(404).json({ error: "Business actions are not enabled." }); return; }
  const params = ToggleBusinessFollowParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const viewer = await current(req);
  if (!viewer) { res.status(401).json({ error: "Sign in is required to follow a business." }); return; }
  const result = await business.toggleFollow(params.data.targetId, viewer.id);
  if (!result) { res.status(404).json({ error: "Business Target not found or unavailable." }); return; }
  res.json(ToggleBusinessFollowResponse.parse(result));
});

router.post("/business/:targetId/claims", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_section_enabled") || !flagEnabled("business_targets_enabled") || !flagEnabled("business_claim_enabled")) { res.status(404).json({ error: "Business claims are not enabled." }); return; }
  const params = SubmitBusinessClaimParams.safeParse(req.params);
  const body = SubmitBusinessClaimBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Enter valid claim information." }); return; }
  const viewer = await current(req);
  if (!viewer) { res.status(401).json({ error: "Sign in is required to claim a business." }); return; }
  const result = await business.submitClaim(params.data.targetId, viewer.id, body.data.verificationMethod, body.data.evidence ?? "");
  if ("conflict" in result) {
    const messages = { unavailable: "Business Target not found or unavailable.", verified: "This business is already verified.", owned: "This business already has an active owner.", duplicate: "You already have an active claim for this business." };
    res.status(409).json({ error: messages[result.conflict as keyof typeof messages] ?? "Business claim could not be submitted." }); return;
  }
  res.status(201).json(SubmitBusinessClaimResponse.parse({ ...result.claim, createdAt: result.claim.createdAt.toISOString(), updatedAt: result.claim.updatedAt.toISOString() }));
});

async function authorizedCenter(req: Parameters<typeof getAuth>[0], targetId: string) {
  const viewer = await current(req);
  if (!viewer) return { status: 401 as const };
  const membership = await business.getMembership(targetId, viewer.id);
  if (!membership) return { status: 403 as const };
  const target = (await db.select({ slug: targetsTable.slug }).from(targetsTable).where(and(eq(targetsTable.id, targetId), eq(targetsTable.type, "business"))))[0];
  if (!target) return { status: 404 as const };
  return { viewer, membership, target };
}

router.get("/business/:targetId/center", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_center_enabled")) { res.status(404).json({ error: "Business Center is not enabled." }); return; }
  const params = GetBusinessCenterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const auth = await authorizedCenter(req, params.data.targetId);
  if ("status" in auth) { const status = auth.status ?? 500; res.status(status).json({ error: status === 401 ? "Sign in is required." : status === 403 ? "You are not authorized to manage this business." : "Business Target not found." }); return; }
  const detail = detailPayload(await business.getBusinessBySlug(auth.target.slug));
  if (!detail) { res.status(404).json({ error: "Business Target not found." }); return; }
  res.json(GetBusinessCenterResponse.parse({ ...detail, membershipRole: auth.membership.role }));
});

router.get("/business/:targetId/center/analytics", async (req, res): Promise<void> => {
  await ensureAdminState();
  if (!flagEnabled("business_center_enabled")) { res.status(404).json({ error: "Business Center is not enabled." }); return; }
  const params = GetBusinessAnalyticsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const auth = await authorizedCenter(req, params.data.targetId);
  if ("status" in auth) { const status = auth.status ?? 500; res.status(status).json({ error: status === 401 ? "Sign in is required." : "You are not authorized to view this business." }); return; }
  const detail = await business.getBusinessBySlug(auth.target.slug);
  if (!detail) { res.status(404).json({ error: "Business Target not found." }); return; }
  const engagementRate = detail.viewCount > 0 ? (detail.commentCount + detail.reactionCount) / detail.viewCount : 0;
  res.json(GetBusinessAnalyticsResponse.parse({ blastCount: detail.blastCount, viewCount: detail.viewCount, commentCount: detail.commentCount, reactionCount: detail.reactionCount, followerCount: detail.followerCount, engagementRate }));
});

export default router;