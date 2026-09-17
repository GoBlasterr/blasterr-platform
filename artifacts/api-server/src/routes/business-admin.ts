import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  CreateAdminBusinessBody, CreateAdminBusinessResponse, ListAdminBusinessClaimsQueryParams, ListAdminBusinessClaimsResponse,
  ListAdminBusinessesQueryParams, ListAdminBusinessesResponse, ReviewAdminBusinessClaimBody, ReviewAdminBusinessClaimParams,
  ReviewAdminBusinessClaimResponse, UpdateAdminBusinessBody, UpdateAdminBusinessParams, UpdateAdminBusinessResponse,
  GetAdminBusinessParams, GetAdminBusinessResponse, AssignAdminBusinessOwnerBody, AssignAdminBusinessOwnerParams,
  AssignAdminBusinessOwnerResponse, RemoveAdminBusinessOwnerBody, RemoveAdminBusinessOwnerParams, RemoveAdminBusinessOwnerResponse,
  GetAdminBusinessStatsResponse,
} from "@workspace/api-zod";
import { businessClaimsTable, businessProfilesTable, db, targetsTable } from "@workspace/db";
import * as business from "../lib/business-repository";
import { adminFeatureFlags, ensureAdminState, recordAudit } from "../lib/admin-state";

const router: IRouter = Router();
const actor = (res: Response) => String(res.locals.adminActorId ?? "");
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await ensureAdminState(); } catch { res.status(503).json({ error: "Admin state is temporarily unavailable." }); return; }
  if (!res.locals.adminActorId) { res.status(401).json({ error: "Authentication required." }); return; }
  next();
}
const slugFor = (name: string, location: string) => `${name}-${location}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
const claimPayload = (claim: NonNullable<Awaited<ReturnType<typeof business.reviewClaim>>>) => ({ ...claim, createdAt: claim.createdAt.toISOString(), updatedAt: claim.updatedAt.toISOString() });

router.use(requireAdmin);

router.get("/business", async (req, res): Promise<void> => {
  const parsed = ListAdminBusinessesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.json(ListAdminBusinessesResponse.parse(await business.listBusinesses({ ...parsed.data, includeInactive: true })));
});

router.get("/business/stats", async (_req, res): Promise<void> => {
  res.json(GetAdminBusinessStatsResponse.parse(await business.getAdminBusinessStats()));
});

router.post("/business", async (req, res): Promise<void> => {
  const body = CreateAdminBusinessBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const slug = slugFor(body.data.name, body.data.location);
  try {
    const created = await business.createBusinessTarget({
      name: body.data.name, slug, location: body.data.location, category: body.data.category ?? "other",
      description: body.data.description ?? "", imageUrl: body.data.imageUrl ?? "", bannerImageUrl: body.data.bannerImageUrl ?? "",
      featured: body.data.featured ?? false, verified: body.data.verified ?? false,
       status: body.data.status ?? "active", latitude: body.data.latitude, longitude: body.data.longitude,
      profile: { subcategory: body.data.subcategory ?? "", address: body.data.address ?? "", city: body.data.city ?? "", state: body.data.state ?? "", postalCode: body.data.postalCode ?? "", phone: body.data.phone ?? "", website: body.data.website ?? "", email: body.data.email ?? "" },
    }, actor(res));
    if (created.conflict) { res.status(409).json({ error: "A canonical Business Target with this identity already exists." }); return; }
    const detail = await business.getBusinessBySlug(created.target.slug, true);
    await recordAudit({ action: "business_target_created", entityType: "business_target", entityId: created.target.id, actorId: actor(res), details: `Created Business Target ${created.target.name}.` });
    res.status(201).json(CreateAdminBusinessResponse.parse({ ...detail, blasts: detail?.blasts.map((blast) => ({ ...blast, createdAt: blast.createdAt.toISOString(), updatedAt: blast.updatedAt.toISOString() })) }));
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Business Target could not be created." });
  }
});

router.patch("/business/claims/:claimId", async (req, res): Promise<void> => {
  const params = ReviewAdminBusinessClaimParams.safeParse(req.params); const body = ReviewAdminBusinessClaimBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid claim review." }); return; }
  if (body.data.status === "approved" && !adminFeatureFlags.find((flag) => flag.key === "business_verification_enabled")?.enabled) { res.status(403).json({ error: "Business verification is disabled." }); return; }
  const claim = await business.reviewClaim(params.data.claimId, actor(res), body.data.status, body.data.reviewNote ?? "");
  if (!claim) { res.status(404).json({ error: "Claim request not found." }); return; }
  await recordAudit({ action: `business_claim_${body.data.status}`, entityType: "business_claim", entityId: claim.id, actorId: actor(res), details: `Business claim marked ${body.data.status}.` });
  res.json(ReviewAdminBusinessClaimResponse.parse(claimPayload(claim)));
});

router.patch("/business/:targetId", async (req, res): Promise<void> => {
  const params = UpdateAdminBusinessParams.safeParse(req.params);
  const body = UpdateAdminBusinessBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid Business Target update." }); return; }
  const existing = (await db.select().from(targetsTable).where(and(eq(targetsTable.id, params.data.targetId), eq(targetsTable.type, "business"))))[0];
  if (!existing) { res.status(404).json({ error: "Business Target not found." }); return; }
  const patch = body.data;
  await db.transaction(async (tx) => {
    await tx.update(targetsTable).set({
      ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}), ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
      ...(patch.bannerImageUrl !== undefined ? { bannerImageUrl: patch.bannerImageUrl } : {}), ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
      ...(patch.verified !== undefined ? { verified: patch.verified } : {}), ...(patch.status === "hidden" ? { archivedAt: new Date() } : patch.status === "active" ? { archivedAt: null } : {}),
       ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}), ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
      updatedAt: new Date(),
    }).where(eq(targetsTable.id, existing.id));
    await tx.insert(businessProfilesTable).values({
      targetId: existing.id, category: patch.category ?? "other", subcategory: patch.subcategory ?? "", address: patch.address ?? "",
      city: patch.city ?? "", state: patch.state ?? "", postalCode: patch.postalCode ?? "", phone: patch.phone ?? "",
      website: patch.website ?? "", email: patch.email ?? "", verificationStatus: patch.verified ? "verified" : "unverified",
      status: patch.status ?? "active",
    }).onConflictDoUpdate({ target: businessProfilesTable.targetId, set: { ...(patch.category !== undefined ? { category: patch.category } : {}), ...(patch.subcategory !== undefined ? { subcategory: patch.subcategory } : {}), ...(patch.address !== undefined ? { address: patch.address } : {}), ...(patch.city !== undefined ? { city: patch.city } : {}), ...(patch.state !== undefined ? { state: patch.state } : {}), ...(patch.postalCode !== undefined ? { postalCode: patch.postalCode } : {}), ...(patch.phone !== undefined ? { phone: patch.phone } : {}), ...(patch.website !== undefined ? { website: patch.website } : {}), ...(patch.email !== undefined ? { email: patch.email } : {}), ...(patch.status !== undefined ? { status: patch.status } : {}), ...(patch.verified !== undefined ? { verificationStatus: patch.verified ? "verified" : "unverified" } : {}), updatedAt: new Date() } });
  });
  const detail = await business.getBusinessBySlug(existing.slug, true);
  await recordAudit({ action: "business_target_updated", entityType: "business_target", entityId: existing.id, actorId: actor(res), details: `Updated Business Target ${existing.name}.` });
  res.json(UpdateAdminBusinessResponse.parse({ ...detail, blasts: detail?.blasts.map((blast) => ({ ...blast, createdAt: blast.createdAt.toISOString(), updatedAt: blast.updatedAt.toISOString() })) }));
});

router.post("/business/:targetId/owners", async (req, res): Promise<void> => {
  const params = AssignAdminBusinessOwnerParams.safeParse(req.params);
  const body = AssignAdminBusinessOwnerBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Provide an existing user ID or email." }); return; }
  const owner = await business.assignBusinessOwner(params.data.targetId, body.data);
  if (!owner) { res.status(404).json({ error: "User or Business Target not found." }); return; }
  await recordAudit({ action: "business_owner_assigned", entityType: "business_target", entityId: params.data.targetId, actorId: actor(res), details: `Assigned ${owner.email} as Business Target owner.` });
  res.json(AssignAdminBusinessOwnerResponse.parse(owner));
});

router.delete("/business/:targetId/owners", async (req, res): Promise<void> => {
  const params = RemoveAdminBusinessOwnerParams.safeParse(req.params);
  const body = RemoveAdminBusinessOwnerBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Provide an existing user ID or email." }); return; }
  const owner = await business.removeBusinessOwner(params.data.targetId, body.data);
  if (!owner) { res.status(404).json({ error: "Active owner not found." }); return; }
  await recordAudit({ action: "business_owner_removed", entityType: "business_target", entityId: params.data.targetId, actorId: actor(res), details: `Removed ${owner.email} as Business Target owner.` });
  res.json(RemoveAdminBusinessOwnerResponse.parse(owner));
});

router.get("/business/claims", async (req, res): Promise<void> => {
  const parsed = ListAdminBusinessClaimsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const page = parsed.data.page ?? 1; const limit = parsed.data.limit ?? 25;
  const where = parsed.data.status ? eq(businessClaimsTable.status, parsed.data.status) : undefined;
  const [items, total] = await Promise.all([
    db.select().from(businessClaimsTable).where(where).orderBy(desc(businessClaimsTable.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ value: sql<number>`count(*)::int` }).from(businessClaimsTable).where(where),
  ]);
  res.json(ListAdminBusinessClaimsResponse.parse({ items: items.map(claimPayload), page, limit, total: total[0]?.value ?? 0, hasMore: page * limit < (total[0]?.value ?? 0) }));
});

router.get("/business/:targetId", async (req, res): Promise<void> => {
  const params = GetAdminBusinessParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const detail = await business.getAdminBusinessById(params.data.targetId);
  if (!detail) { res.status(404).json({ error: "Business Target not found." }); return; }
  res.json(GetAdminBusinessResponse.parse({ ...detail, blasts: detail.blasts.map((blast) => ({ ...blast, createdAt: blast.createdAt.toISOString(), updatedAt: blast.updatedAt.toISOString() })) }));
});

export default router;