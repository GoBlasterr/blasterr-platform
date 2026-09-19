import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  blastsTable,
  businessClaimsTable,
  businessFollowsTable,
  businessMembershipsTable,
  businessProfilesTable,
  adminAuditEventsTable,
  targetAliasesTable,
  usersTable,
  targetsTable,
  db,
} from "@workspace/db";
import { normalizeTargetText, targetIdentityLockKey } from "./target-resolution";

export type BusinessFilters = { page?: number; limit?: number; q?: string; city?: string; state?: string; category?: string; featured?: boolean; status?: string; includeInactive?: boolean };
const pageArgs = (filters: BusinessFilters) => ({ page: Math.max(1, filters.page ?? 1), limit: Math.min(100, Math.max(1, filters.limit ?? 20)) });

/** The single public eligibility predicate used by follow and claim mutations. */
export const publicBusinessPredicate = (target = targetsTable, profile = businessProfilesTable) => and(
  eq(target.type, "business"),
  sql`${target.archivedAt} is null`,
  eq(target.preloadStatus, "active"),
  sql`coalesce(${profile.status}, 'active') = 'active'`,
);

export async function getPublicBusinessTarget(targetId: string) {
  return (await db.select({ id: targetsTable.id, verified: targetsTable.verified, profileStatus: businessProfilesTable.status, verificationStatus: businessProfilesTable.verificationStatus })
    .from(targetsTable).leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id))
    .where(and(eq(targetsTable.id, targetId), publicBusinessPredicate())))[0];
}

function aggregateColumns() {
  return {
    id: targetsTable.id, name: targetsTable.name, slug: targetsTable.slug, location: targetsTable.location,
    description: targetsTable.description, imageUrl: targetsTable.imageUrl, bannerImageUrl: targetsTable.bannerImageUrl,
    featured: targetsTable.featured, verified: targetsTable.verified,
    category: sql<string>`coalesce(${businessProfilesTable.category}, ${targetsTable.preloadCategory}, 'other')`,
    status: sql<string>`coalesce(${businessProfilesTable.status}, 'active')`,
    verificationStatus: sql<string>`coalesce(${businessProfilesTable.verificationStatus}, case when ${targetsTable.verified} then 'verified' else 'unverified' end)`,
    claimStatus: sql<string>`coalesce((select c.status from business_claims c where c.target_id = ${targetsTable.id} order by c.created_at desc limit 1), 'unclaimed')`,
    ownerCount: sql<number>`(select count(*)::int from business_memberships m where m.target_id = ${targetsTable.id} and m.status = 'active')`,
    blastCount: sql<number>`(select count(*)::int from blasts b where b.target_id = ${targetsTable.id} and b.status = 'active' and b.visibility = 'public')`,
    viewCount: sql<number>`(select coalesce(sum(b.view_count), 0)::int from blasts b where b.target_id = ${targetsTable.id} and b.status = 'active' and b.visibility = 'public')`,
    commentCount: sql<number>`(select count(*)::int from comments c join blasts b on b.id = c.blast_id where b.target_id = ${targetsTable.id} and b.status = 'active' and b.visibility = 'public')`,
    reactionCount: sql<number>`(select count(*)::int from reactions r join blasts b on b.id = r.blast_id where b.target_id = ${targetsTable.id} and b.status = 'active' and b.visibility = 'public')`,
    followerCount: sql<number>`(select count(*)::int from business_follows f where f.target_id = ${targetsTable.id})`,
    latitude: targetsTable.latitude,
    longitude: targetsTable.longitude,
    createdAt: sql<string>`${targetsTable.createdAt}::text`,
  };
}

function conditions(filters: BusinessFilters) {
  const where = [eq(targetsTable.type, "business")];
  if (!filters.includeInactive) where.push(sql`${targetsTable.archivedAt} is null`, sql`${targetsTable.preloadStatus} = 'active'`, sql`coalesce(${businessProfilesTable.status}, 'active') = 'active'`);
  if (filters.q?.trim()) where.push(ilike(targetsTable.name, `%${filters.q.trim()}%`));
  if (filters.city?.trim()) where.push(ilike(sql`coalesce(${businessProfilesTable.city}, ${targetsTable.location})`, `%${filters.city.trim()}%`));
  if (filters.state?.trim()) where.push(ilike(businessProfilesTable.state, `%${filters.state.trim()}%`));
  if (filters.category?.trim()) where.push(ilike(sql`coalesce(${businessProfilesTable.category}, ${targetsTable.preloadCategory}, 'other')`, filters.category.trim()));
  if (filters.featured !== undefined) where.push(eq(targetsTable.featured, filters.featured));
  if (filters.status) where.push(eq(businessProfilesTable.status, filters.status));
  return and(...where);
}

export async function listBusinesses(filters: BusinessFilters = {}) {
  const { page, limit } = pageArgs(filters);
  const where = conditions(filters);
  const [items, totalRows] = await Promise.all([
    db.select(aggregateColumns()).from(targetsTable)
      .leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id))
      .where(where)
      .orderBy(desc(targetsTable.featured), desc(sql`(select count(*) from blasts b where b.target_id = ${targetsTable.id} and b.status = 'active' and b.visibility = 'public')`), desc(targetsTable.createdAt))
      .limit(limit).offset((page - 1) * limit),
    db.select({ value: sql<number>`count(*)::int` }).from(targetsTable).leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id)).where(where),
  ]);
  const total = totalRows[0]?.value ?? 0;
  return { items, page, limit, total, hasMore: page * limit < total };
}

export async function getAdminBusinessStats() {
  const [stats] = await db.select({
    totalTargets: sql<number>`count(*)::int`,
    claimed: sql<number>`count(*) filter (where exists (select 1 from business_memberships m where m.target_id = ${targetsTable.id} and m.status = 'active'))::int`,
    unclaimed: sql<number>`count(*) filter (where not exists (select 1 from business_memberships m where m.target_id = ${targetsTable.id} and m.status = 'active'))::int`,
    verified: sql<number>`count(*) filter (where ${targetsTable.verified} or ${businessProfilesTable.verificationStatus} = 'verified')::int`,
    pendingVerification: sql<number>`count(*) filter (where ${businessProfilesTable.verificationStatus} = 'pending' or exists (select 1 from business_claims c where c.target_id = ${targetsTable.id} and c.status in ('pending', 'more_info')))::int`,
    featured: sql<number>`count(*) filter (where ${targetsTable.featured})::int`,
    hidden: sql<number>`count(*) filter (where ${targetsTable.archivedAt} is not null or ${businessProfilesTable.status} = 'hidden')::int`,
    recentActivity: sql<number>`count(*) filter (where exists (select 1 from blasts b where b.target_id = ${targetsTable.id} and b.created_at >= now() - interval '7 days'))::int`,
  }).from(targetsTable)
    .leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id))
    .where(eq(targetsTable.type, "business"));
  return stats ?? { totalTargets: 0, claimed: 0, unclaimed: 0, verified: 0, pendingVerification: 0, featured: 0, hidden: 0, recentActivity: 0 };
}

export async function getBusinessBySlug(slug: string, includeInactive = false) {
  const rows = await db.select(aggregateColumns()).from(targetsTable)
    .leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id))
    .where(and(eq(targetsTable.slug, slug), eq(targetsTable.type, "business"), ...(includeInactive ? [] : [sql`${targetsTable.archivedAt} is null`, sql`${targetsTable.preloadStatus} = 'active'`, sql`coalesce(${businessProfilesTable.status}, 'active') = 'active'`])));
  const target = rows[0];
  if (!target) return null;
  const profile = (await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.targetId, target.id)))[0];
  const recentBlasts = await db.select().from(blastsTable).where(and(eq(blastsTable.targetId, target.id), eq(blastsTable.status, "active"), eq(blastsTable.visibility, "public"))).orderBy(desc(blastsTable.createdAt)).limit(20);
  return { ...target, category: profile?.category ?? target.category, subcategory: profile?.subcategory ?? "", address: profile?.address ?? "", city: profile?.city ?? "", state: profile?.state ?? "", postalCode: profile?.postalCode ?? "", phone: profile?.phone ?? "", website: profile?.website ?? "", email: profile?.email ?? "", verificationStatus: profile?.verificationStatus ?? (target.verified ? "verified" : "unverified"), status: profile?.status ?? "active", blasts: recentBlasts };
}

export async function getAdminBusinessById(targetId: string) {
  const target = (await db.select(aggregateColumns()).from(targetsTable)
    .leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id))
    .where(and(eq(targetsTable.id, targetId), eq(targetsTable.type, "business"))))[0];
  if (!target) return null;
  const detail = await getBusinessBySlug(target.slug, true);
  if (!detail) return null;
  const [claims, owners] = await Promise.all([
    db.select().from(businessClaimsTable).where(eq(businessClaimsTable.targetId, targetId)).orderBy(desc(businessClaimsTable.createdAt)),
    db.select({ userId: businessMembershipsTable.userId, role: businessMembershipsTable.role, status: businessMembershipsTable.status, displayName: usersTable.displayName, email: usersTable.email })
      .from(businessMembershipsTable).innerJoin(usersTable, eq(usersTable.id, businessMembershipsTable.userId))
      .where(eq(businessMembershipsTable.targetId, targetId)).orderBy(desc(businessMembershipsTable.updatedAt)),
  ]);
  const auditEntityIds = [targetId, ...claims.map((claim) => claim.id)];
  const auditHistory = await db.select().from(adminAuditEventsTable)
    .where(or(and(eq(adminAuditEventsTable.entityType, "business_target"), eq(adminAuditEventsTable.entityId, targetId)), and(eq(adminAuditEventsTable.entityType, "business_claim"), inArray(adminAuditEventsTable.entityId, auditEntityIds))))
    .orderBy(desc(adminAuditEventsTable.createdAt));
  return {
    ...detail, claims: claims.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })), owners,
    auditHistory: auditHistory.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    analytics: {
      blastCount: detail.blastCount, viewCount: detail.viewCount, commentCount: detail.commentCount,
      reactionCount: detail.reactionCount, followerCount: detail.followerCount,
      engagementRate: detail.viewCount ? (detail.commentCount + detail.reactionCount) / detail.viewCount : 0,
    },
  };
}

export async function resolveBusinessOwner(input: { userId?: string; email?: string }) {
  return (await db.select({ id: usersTable.id, displayName: usersTable.displayName, email: usersTable.email })
    .from(usersTable).where(input.userId ? eq(usersTable.id, input.userId) : eq(usersTable.email, input.email ?? "")))[0] ?? null;
}

export async function assignBusinessOwner(targetId: string, input: { userId?: string; email?: string }) {
  const user = await resolveBusinessOwner(input);
  if (!user) return null;
  return db.transaction(async (tx) => {
    await lockBusinessOwnerSet(tx, targetId);
    const target = (await tx.select({ id: targetsTable.id }).from(targetsTable)
      .where(and(eq(targetsTable.id, targetId), eq(targetsTable.type, "business"))))[0];
    if (!target) return null;
    if (!(await hasOwnerCapacity(tx, user.id, targetId))) return { conflict: "limit" as const };
    await tx.insert(businessMembershipsTable).values({ targetId, userId: user.id, role: "owner", status: "active" })
      .onConflictDoUpdate({ target: [businessMembershipsTable.targetId, businessMembershipsTable.userId], set: { role: "owner", status: "active", updatedAt: new Date() } });
    return { userId: user.id, role: "owner", status: "active" as const, displayName: user.displayName, email: user.email };
  });
}

export async function removeBusinessOwner(targetId: string, input: { userId?: string; email?: string }) {
  const user = await resolveBusinessOwner(input);
  if (!user) return null;
  const updated = await db.update(businessMembershipsTable).set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(businessMembershipsTable.targetId, targetId), eq(businessMembershipsTable.userId, user.id))).returning();
  if (!updated[0]) return null;
  return { userId: user.id, role: updated[0].role, status: "revoked" as const, displayName: user.displayName, email: user.email };
}

export async function toggleFollow(targetId: string, userId: string) {
  return db.transaction(async (tx) => {
    const target = (await tx.select({ id: targetsTable.id }).from(targetsTable).leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id)).where(and(eq(targetsTable.id, targetId), publicBusinessPredicate())))[0];
    if (!target) return null;
    await tx.execute(sql`select id from targets where id = ${targetId} for update`);
    const existing = await tx.select().from(businessFollowsTable).where(and(eq(businessFollowsTable.targetId, targetId), eq(businessFollowsTable.userId, userId)));
    if (existing[0]) await tx.delete(businessFollowsTable).where(and(eq(businessFollowsTable.targetId, targetId), eq(businessFollowsTable.userId, userId)));
    else await tx.insert(businessFollowsTable).values({ targetId, userId });
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(businessFollowsTable).where(eq(businessFollowsTable.targetId, targetId));
    return { following: !existing[0], followerCount: count ?? 0 };
  });
}

export async function getMembership(targetId: string, userId: string) {
  return (await db.select().from(businessMembershipsTable).where(and(eq(businessMembershipsTable.targetId, targetId), eq(businessMembershipsTable.userId, userId), eq(businessMembershipsTable.status, "active"))))[0];
}

export const ownedBusinessLimit = 5;
type BusinessTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function lockBusinessOwnerSet(tx: BusinessTransaction, targetId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(92101, hashtext(${targetId}))`);
}

async function hasOwnerCapacity(tx: BusinessTransaction, userId: string, targetId?: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(92102, hashtext(${userId}))`);
  if (targetId) {
    const existing = (await tx.select({ targetId: businessMembershipsTable.targetId })
      .from(businessMembershipsTable)
      .where(and(
        eq(businessMembershipsTable.targetId, targetId),
        eq(businessMembershipsTable.userId, userId),
        eq(businessMembershipsTable.role, "owner"),
        eq(businessMembershipsTable.status, "active"),
      )))[0];
    if (existing) return true;
  }
  const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
    .from(businessMembershipsTable)
    .innerJoin(targetsTable, eq(targetsTable.id, businessMembershipsTable.targetId))
    .where(and(
      eq(businessMembershipsTable.userId, userId),
      eq(businessMembershipsTable.role, "owner"),
      eq(businessMembershipsTable.status, "active"),
      eq(targetsTable.type, "business"),
      sql`${targetsTable.archivedAt} is null`,
    ));
  return (count ?? 0) < ownedBusinessLimit;
}

export async function canActivateBusinessTarget(tx: BusinessTransaction, targetId: string) {
  await lockBusinessOwnerSet(tx, targetId);
  const owners = await tx.select({ userId: businessMembershipsTable.userId })
    .from(businessMembershipsTable)
    .where(and(
      eq(businessMembershipsTable.targetId, targetId),
      eq(businessMembershipsTable.role, "owner"),
      eq(businessMembershipsTable.status, "active"),
    ))
    .orderBy(businessMembershipsTable.userId);
  for (const owner of owners) {
    await tx.execute(sql`select pg_advisory_xact_lock(92102, hashtext(${owner.userId}))`);
  }
  for (const owner of owners) {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
      .from(businessMembershipsTable)
      .innerJoin(targetsTable, eq(targetsTable.id, businessMembershipsTable.targetId))
      .where(and(
        eq(businessMembershipsTable.userId, owner.userId),
        eq(businessMembershipsTable.role, "owner"),
        eq(businessMembershipsTable.status, "active"),
        eq(targetsTable.type, "business"),
        sql`${targetsTable.archivedAt} is null`,
      ));
    if ((count ?? 0) >= ownedBusinessLimit) return false;
  }
  return true;
}

export async function listOwnedBusinesses(userId: string) {
  return db.select(aggregateColumns())
    .from(targetsTable)
    .innerJoin(businessMembershipsTable, eq(businessMembershipsTable.targetId, targetsTable.id))
    .leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id))
    .where(and(
      eq(businessMembershipsTable.userId, userId),
      eq(businessMembershipsTable.role, "owner"),
      eq(businessMembershipsTable.status, "active"),
      eq(targetsTable.type, "business"),
      sql`${targetsTable.archivedAt} is null`,
    ))
    .orderBy(desc(targetsTable.createdAt))
    .limit(ownedBusinessLimit);
}

export async function createOwnedBusinessTarget(input: {
  name: string;
  location: string;
  category: string;
  description: string;
  website?: string;
  email?: string;
  phone?: string;
}, ownerUserId: string) {
  const name = input.name.trim();
  const location = input.location.trim();
  const normalizedName = normalizeTargetText(name);
  const normalizedLocation = normalizeTargetText(location);
  const slug = `${name}-${location}-${randomUUID().slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);

  return db.transaction(async (tx) => {
    if (!(await hasOwnerCapacity(tx, ownerUserId))) return { conflict: "limit" as const };

    const lockKey = targetIdentityLockKey({ type: "business", name, location });
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const aliasTargetIds = (await tx.select({ targetId: targetAliasesTable.targetId })
      .from(targetAliasesTable)
      .where(eq(targetAliasesTable.normalizedAlias, normalizedName))).map((row) => row.targetId);
    const canonical = (await tx.select({ id: targetsTable.id, slug: targetsTable.slug })
      .from(targetsTable)
      .where(and(
        eq(targetsTable.isCanonical, true),
        eq(targetsTable.isPreloaded, true),
        or(
          eq(targetsTable.normalizedName, normalizedName),
          ...(aliasTargetIds.length ? [inArray(targetsTable.id, aliasTargetIds)] : []),
        ),
      )))[0];
    if (canonical) return { conflict: "duplicate" as const, target: canonical };
    const existing = (await tx.select({ id: targetsTable.id, slug: targetsTable.slug })
      .from(targetsTable)
      .where(and(eq(targetsTable.type, "business"), eq(targetsTable.normalizedName, normalizedName), eq(targetsTable.normalizedLocation, normalizedLocation))))[0];
    if (existing) return { conflict: "duplicate" as const, target: existing };

    const [target] = await tx.insert(targetsTable).values({
      id: `target-${randomUUID()}`,
      name,
      slug,
      type: "business",
      description: input.description.trim(),
      location,
      normalizedName,
      normalizedLocation,
      provenance: "user",
      preloadCategory: input.category,
    }).returning();
    if (!target) throw new Error("Unable to create Business Target.");

    await tx.insert(businessProfilesTable).values({
      targetId: target.id,
      category: input.category,
      website: input.website?.trim() ?? "",
      email: input.email?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      verificationStatus: "unverified",
      status: "active",
    });
    await tx.insert(businessMembershipsTable).values({
      targetId: target.id,
      userId: ownerUserId,
      role: "owner",
      status: "active",
    });
    return { conflict: null, target };
  });
}

export async function submitClaim(targetId: string, applicantId: string, verificationMethod: string, evidence: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from targets where id = ${targetId} for update`);
    const target = (await tx.select({ id: targetsTable.id, verified: targetsTable.verified, profileStatus: businessProfilesTable.status, verificationStatus: businessProfilesTable.verificationStatus })
      .from(targetsTable).leftJoin(businessProfilesTable, eq(businessProfilesTable.targetId, targetsTable.id)).where(and(eq(targetsTable.id, targetId), publicBusinessPredicate())))[0];
    if (!target) return { conflict: "unavailable" as const };
    if (target.verified || target.verificationStatus === "verified") return { conflict: "verified" as const };
    const membership = (await tx.select({ targetId: businessMembershipsTable.targetId }).from(businessMembershipsTable).where(and(eq(businessMembershipsTable.targetId, targetId), eq(businessMembershipsTable.status, "active"))))[0];
    if (membership) return { conflict: "owned" as const };
    const existing = (await tx.select().from(businessClaimsTable).where(and(eq(businessClaimsTable.targetId, targetId), eq(businessClaimsTable.applicantId, applicantId), sql`${businessClaimsTable.status} in ('pending', 'more_info')`)))[0];
    if (existing) return { conflict: "duplicate" as const };
    const [claim] = await tx.insert(businessClaimsTable).values({ targetId, applicantId, verificationMethod, evidence }).returning();
    return { claim };
  });
}

export async function reviewClaim(claimId: string, reviewerId: string, status: "approved" | "rejected" | "more_info", reviewNote: string) {
  return db.transaction(async (tx) => {
    const claim = (await tx.select().from(businessClaimsTable).where(eq(businessClaimsTable.id, claimId)))[0];
    if (!claim) return null;
    if (!["pending", "more_info"].includes(claim.status)) return null;
    await lockBusinessOwnerSet(tx, claim.targetId);
    if (status === "approved" && !(await hasOwnerCapacity(tx, claim.applicantId, claim.targetId))) {
      return { conflict: "limit" as const };
    }
    await tx.execute(sql`select id from targets where id = ${claim.targetId} for update`);
    await tx.execute(sql`select target_id from business_profiles where target_id = ${claim.targetId} for update`);
    const target = (await tx.select({ id: targetsTable.id, verified: targetsTable.verified }).from(targetsTable).where(eq(targetsTable.id, claim.targetId)))[0];
    const profile = (await tx.select({ verificationStatus: businessProfilesTable.verificationStatus }).from(businessProfilesTable).where(eq(businessProfilesTable.targetId, claim.targetId)))[0];
    const activeOwners = await tx.select({ userId: businessMembershipsTable.userId }).from(businessMembershipsTable).where(and(eq(businessMembershipsTable.targetId, claim.targetId), eq(businessMembershipsTable.status, "active")));
    if (status === "approved" && (target?.verified || profile?.verificationStatus === "verified" || activeOwners.length > 0)) {
      const [closed] = await tx.update(businessClaimsTable).set({ status: "rejected", reviewerId, reviewNote: reviewNote || "Business is already verified or owned.", updatedAt: new Date() }).where(and(eq(businessClaimsTable.id, claimId), sql`${businessClaimsTable.status} in ('pending', 'more_info')`)).returning();
      return closed ?? null;
    }
    const [updated] = await tx.update(businessClaimsTable).set({ status, reviewerId, reviewNote, updatedAt: new Date() })
      .where(and(eq(businessClaimsTable.id, claimId), sql`${businessClaimsTable.status} in ('pending', 'more_info')`)).returning();
    if (!updated) return null;
    if (status === "approved") {
      await tx.insert(businessMembershipsTable).values({ targetId: claim.targetId, userId: claim.applicantId, role: "owner", status: "active" }).onConflictDoUpdate({ target: [businessMembershipsTable.targetId, businessMembershipsTable.userId], set: { status: "active", role: "owner", updatedAt: new Date() } });
      await tx.insert(businessProfilesTable).values({ targetId: claim.targetId, verificationStatus: "verified" }).onConflictDoUpdate({ target: businessProfilesTable.targetId, set: { verificationStatus: "verified", updatedAt: new Date() } });
      await tx.update(targetsTable).set({ verified: true, updatedAt: new Date() }).where(eq(targetsTable.id, claim.targetId));
      await tx.update(businessClaimsTable).set({ status: "rejected", reviewerId, reviewNote: "Another claim was approved for this Business Target.", updatedAt: new Date() }).where(and(eq(businessClaimsTable.targetId, claim.targetId), sql`${businessClaimsTable.status} in ('pending', 'more_info')`, sql`${businessClaimsTable.id} <> ${claimId}`));
    }
    return updated;
  });
}

export async function createBusinessTarget(input: {
  name: string; slug: string; location: string; category: string; description: string; imageUrl: string; bannerImageUrl: string;
  featured: boolean; verified: boolean; status: "active" | "hidden" | "locked"; latitude?: number; longitude?: number; profile: { subcategory: string; address: string; city: string; state: string; postalCode: string; phone: string; website: string; email: string };
}, actorId: string) {
  return db.transaction(async (tx) => {
    const created = await socialCreatePreloadedTarget(tx, input, actorId);
    if (!created.created) return { conflict: true as const, target: created.target };
   await tx.update(targetsTable).set({ location: input.location, latitude: input.latitude, longitude: input.longitude, updatedAt: new Date() }).where(eq(targetsTable.id, created.target.id));
    await tx.insert(businessProfilesTable).values({ targetId: created.target.id, category: input.category, subcategory: input.profile.subcategory, address: input.profile.address, city: input.profile.city, state: input.profile.state, postalCode: input.profile.postalCode, phone: input.profile.phone, website: input.profile.website, email: input.profile.email, verificationStatus: input.verified ? "verified" : "unverified", status: input.status });
    return { conflict: false as const, target: created.target };
  });
}

// Kept here to ensure Target and profile are committed in one transaction.
async function socialCreatePreloadedTarget(tx: any, input: Parameters<typeof createBusinessTarget>[0], actorId: string) {
  const canonicalKey = input.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const existing = (await tx.select().from(targetsTable).where(sql`${targetsTable.canonicalKey} = ${canonicalKey} or (${targetsTable.type} = 'business' and ${targetsTable.normalizedName} = ${input.name.trim().toLowerCase()} and ${targetsTable.normalizedLocation} = ${input.location.trim().toLowerCase()})`))[0];
  if (existing) return { created: false, target: existing };
   const [target] = await tx.insert(targetsTable).values({ id: `target-${randomUUID()}`, name: input.name.trim(), slug: input.slug, type: "business", description: input.description, imageUrl: input.imageUrl, bannerImageUrl: input.bannerImageUrl, location: input.location, latitude: input.latitude, longitude: input.longitude, normalizedName: input.name.trim().toLowerCase(), normalizedLocation: input.location.trim().toLowerCase(), isCanonical: true, isPreloaded: true, preloadCategory: input.category, provenance: "admin", createdByAdminId: actorId, featured: input.featured, verified: input.verified, canonicalKey, archivedAt: input.status === "hidden" ? new Date() : null }).returning();
  if (!target) throw new Error("Unable to create Business Target.");
  return { created: true, target };
}