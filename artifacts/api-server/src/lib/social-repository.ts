import { randomUUID } from "node:crypto";
import {
  adminAuditEventsTable, adminReportsTable, blastsTable, blocksTable, bookmarksTable, commentsTable, db, followsTable,
  notificationsTable, reactionsTable, reportsTable, targetsTable, usersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { shouldBootstrapSocialFixtures } from "./social-bootstrap-policy";
import { normalizeTargetText, targetIdentityLockKey } from "./target-resolution";
import { readableProfileMedia } from "./profile-media";

export type Reaction = "blast" | "facts" | "cap" | "funny" | "watching";
export type SocialUser = { id: string; username: string; displayName: string; avatarUrl: string; coverUrl: string; bio: string; location: string; city: string; state: string; followers: number; following: number; blastCount: number; joinedAt: string; isFollowing?: boolean; zipCode?: string };
export type SocialTarget = { id: string; name: string; slug: string; type: "person" | "business" | "place" | "product" | "entertainment" | "sports" | "gaming" | "other"; location: string; blastCount: number; imageUrl: string; description: string };
export class DuplicateAccountEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateAccountEmailError";
  }
}

const developmentUsers = [
  { id: "user-kinamin", authId: "development-preview", username: "kinamin", displayName: "Kinamin", email: "kinamin@development.invalid", bio: "Building the next conversation layer of the internet.", location: "Atlanta, GA", city: "Atlanta", state: "GA", createdAt: new Date("2026-01-17T15:20:00.000Z") },
  { id: "user-nova", authId: "development-nova", username: "novaraye", displayName: "Nova Raye", email: "nova@development.invalid", bio: "Food, cities, and unapologetically honest takes.", location: "Atlanta, GA", city: "Atlanta", state: "GA", createdAt: new Date("2025-10-05T10:00:00.000Z") },
  { id: "user-marcus", authId: "development-marcus", username: "marcuswaves", displayName: "Marcus Waves", email: "marcus@development.invalid", bio: "Sports culture without the recycled hot takes.", location: "Charlotte, NC", city: "Charlotte", state: "NC", createdAt: new Date("2025-11-21T12:00:00.000Z") },
] as const;
const developmentTargets = [
  { id: "target-atl-wings", name: "Midnight Wings ATL", slug: "midnight-wings-atl", type: "business", location: "Atlanta, GA", imageUrl: "", description: "Late-night wings, bold sauces, and one of Atlanta's loudest food debates." },
  { id: "target-finals", name: "2026 Pro Basketball Finals", slug: "2026-pro-basketball-finals", type: "sports", location: "United States", imageUrl: "", description: "The championship series everyone is arguing about." },
  { id: "target-neon", name: "NEON/STATIC", slug: "neon-static", type: "entertainment", location: "Worldwide", imageUrl: "", description: "The surprise album reshaping this summer's sound." },
  { id: "target-atlanta", name: "Atlanta", slug: "atlanta", type: "place", location: "Georgia", imageUrl: "", description: "What the city is talking about right now." },
] as const;
let bootstrap: Promise<void> | undefined;
export { shouldBootstrapSocialFixtures };
/** Development fixtures live only in PostgreSQL and are safe across restarts. */
export async function ensureSocialBootstrap(): Promise<void> {
  if (!shouldBootstrapSocialFixtures()) return;
  bootstrap ??= db.transaction(async (tx) => {
    await tx.insert(usersTable).values([...developmentUsers]).onConflictDoNothing();
    await tx.insert(targetsTable).values(developmentTargets.map((target) => ({
      ...target,
      normalizedName: normalizeTargetText(target.name),
      normalizedLocation: normalizeTargetText(target.location),
      ...(target.id === "target-atl-wings" || target.id === "target-atlanta"
        ? { latitude: 33.749, longitude: -84.388 }
        : target.id === "target-finals"
          ? { latitude: 35.2271, longitude: -80.8431 }
          : {}),
    }))).onConflictDoNothing();
    await tx.insert(blastsTable).values([
      { id: "blast-1", userId: "user-nova", targetId: "target-atl-wings", content: "The lemon-pepper glaze here has no business being this good. Midnight Wings just reset the late-night food ranking.", location: "Atlanta, GA", viewCount: 18400, shareCount: 64, createdAt: new Date("2026-08-29T14:08:00.000Z") },
      { id: "blast-2", userId: "user-marcus", targetId: "target-finals", content: "Everybody is talking about the final shot. Nobody is talking about the defensive switch that created it.", location: "Charlotte, NC", viewCount: 84200, shareCount: 218, createdAt: new Date("2026-08-29T12:42:00.000Z") },
      { id: "blast-3", userId: "user-nova", targetId: "target-neon", content: "Track seven sounds like a city at 2 a.m.—beautiful, anxious, and impossible to leave.", location: "Atlanta, GA", viewCount: 31900, shareCount: 77, createdAt: new Date("2026-08-29T09:18:00.000Z") },
      { id: "blast-4", userId: "user-kinamin", targetId: "target-atlanta", content: "Atlanta's best ideas keep happening after the official meeting ends.", location: "Atlanta, GA", viewCount: 12600, shareCount: 29, createdAt: new Date("2026-08-28T23:51:00.000Z") },
    ]).onConflictDoNothing();
  }).catch((error) => { bootstrap = undefined; throw error; });
  await bootstrap;
}

export async function syncClerkUser(input: { authId: string; username: string; displayName: string; email: string; bio?: string; avatarUrl?: string; coverUrl?: string; location?: string; city?: string; state?: string; zipCode?: string }) {
  await ensureSocialBootstrap();
  const [existingAuthUser] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.authId, input.authId));
  const [existingEmailUser] = await db.select({ authId: usersTable.authId }).from(usersTable).where(eq(usersTable.email, input.email));
  if (existingEmailUser && existingEmailUser.authId !== input.authId) {
    const canKeepExistingDevelopmentProfile =
      process.env.NODE_ENV === "development" &&
      Boolean(existingAuthUser);
    if (canKeepExistingDevelopmentProfile) {
      // Preview auth accounts can be recreated or have their email reassigned.
      // Keep the profile already linked to this auth ID without merging rows.
    } else {
      const canAdoptDevelopmentFixture =
        process.env.NODE_ENV === "development" &&
        existingEmailUser.authId.startsWith("development-") &&
        !existingAuthUser;
      if (!canAdoptDevelopmentFixture) throw new DuplicateAccountEmailError();
      const [adopted] = await db.update(usersTable)
        .set({ ...input, email: input.email, bio: input.bio ?? "", avatarUrl: input.avatarUrl ?? "", coverUrl: input.coverUrl ?? "", location: input.location ?? "", city: input.city ?? "", state: input.state ?? "", zipCode: input.zipCode ?? "", updatedAt: new Date() })
        .where(eq(usersTable.authId, existingEmailUser.authId))
        .returning();
      if (!adopted) {
        const [racedAdoption] = await db.select().from(usersTable).where(eq(usersTable.authId, input.authId));
        if (racedAdoption) return racedAdoption;
        throw new Error("Unable to synchronize development user");
      }
      return adopted;
    }
  }
  const email = existingAuthUser?.email ?? input.email;
  const [row] = await db.insert(usersTable).values({ ...input, email, bio: input.bio ?? "", avatarUrl: input.avatarUrl ?? "", coverUrl: input.coverUrl ?? "", location: input.location ?? "", city: input.city ?? "", state: input.state ?? "", zipCode: input.zipCode ?? "" })
    .onConflictDoUpdate({ target: usersTable.authId, set: { username: input.username, displayName: input.displayName, email, bio: input.bio ?? "", avatarUrl: input.avatarUrl ?? "", coverUrl: input.coverUrl ?? "", location: input.location ?? "", city: input.city ?? "", state: input.state ?? "", zipCode: input.zipCode ?? "", updatedAt: new Date() } }).returning();
  if (!row) throw new Error("Unable to synchronize user");
  return row;
}
export async function devViewer() { await ensureSocialBootstrap(); const [row] = await db.select().from(usersTable).where(eq(usersTable.id, "user-kinamin")); if (!row) throw new Error("Development fixture missing"); return row; }
export async function userByAuth(authId: string) { await ensureSocialBootstrap(); const [row] = await db.select().from(usersTable).where(eq(usersTable.authId, authId)); return row; }
export async function userById(id: string) { await ensureSocialBootstrap(); const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id)); return row; }
export async function allUsers() { await ensureSocialBootstrap(); return db.select().from(usersTable); }
export async function userByUsername(username: string) { await ensureSocialBootstrap(); const [row] = await db.select().from(usersTable).where(eq(usersTable.username, username)); return row; }
async function counts(userId: string) {
  const [[followers], [following], [blasts]] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId)),
    db.select({ value: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, userId)),
    db.select({ value: sql<number>`count(*)::int` }).from(blastsTable).where(eq(blastsTable.userId, userId)),
  ]);
  return { followers: followers?.value ?? 0, following: following?.value ?? 0, blastCount: blasts?.value ?? 0 };
}
export async function profile(row: typeof usersTable.$inferSelect, viewerId?: string): Promise<SocialUser> {
  const [c, avatarUrl, coverUrl] = await Promise.all([
    counts(row.id),
    readableProfileMedia(row.avatarUrl, row.authId, "avatar"),
    readableProfileMedia(row.coverUrl, row.authId, "banner"),
  ]);
  const isFollowing = viewerId && viewerId !== row.id ? !!(await db.select().from(followsTable).where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, row.id)))).length : false;
  return { id: row.id, username: row.username, displayName: row.displayName, avatarUrl, coverUrl, bio: row.bio, location: row.location, city: row.city, state: row.state, zipCode: row.zipCode, joinedAt: row.createdAt.toISOString(), ...c, isFollowing };
}
export async function targets() {
  await ensureSocialBootstrap();
  const rows = await db.select().from(targetsTable);
  if (!rows.length) return [];
  const blastCounts = await db.select({
    targetId: blastsTable.targetId,
    count: sql<number>`count(*)::int`,
  }).from(blastsTable).groupBy(blastsTable.targetId);
  const countByTarget = new Map(blastCounts.map((row) => [row.targetId, row.count]));
  return rows.map((row) => ({
    ...row,
    type: row.type as SocialTarget["type"],
    blastCount: countByTarget.get(row.id) ?? 0,
  }));
}
export async function target(id: string) { await ensureSocialBootstrap(); const [row] = await db.select().from(targetsTable).where(eq(targetsTable.id, id)); return row; }
export async function targetSlug(slug: string) { await ensureSocialBootstrap(); const [row] = await db.select().from(targetsTable).where(eq(targetsTable.slug, slug)); return row; }
/**
 * The advisory transaction lock serializes duplicate checks before the
 * normalized composite unique index provides the final database guarantee.
 */
export async function createTarget(input: Omit<SocialTarget, "blastCount">) {
  await ensureSocialBootstrap();
  return db.transaction(async tx => {
    const normalizedName = normalizeTargetText(input.name);
    const normalizedLocation = normalizeTargetText(input.location);
    const identity = targetIdentityLockKey(input);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${identity}))`);
    const duplicate = await tx.select({ id: targetsTable.id }).from(targetsTable)
      .where(and(
        eq(targetsTable.type, input.type),
        eq(targetsTable.normalizedName, normalizedName),
        eq(targetsTable.normalizedLocation, normalizedLocation),
      ));
    if (duplicate.length) {
      const error = new Error("Duplicate target");
      error.name = "DuplicateTargetError";
      throw error;
    }
    const [row] = await tx.insert(targetsTable).values({
      ...input,
      normalizedName,
      normalizedLocation,
    }).returning();
    if (!row) throw new Error("Unable to create target");
    return { ...row, type: row.type as SocialTarget["type"], blastCount: 0 };
  });
}

export async function nearbyBlasts(
  viewerId: string | undefined,
  latitude: number,
  longitude: number,
  radiusMiles: number,
) {
  const items = await blasts(viewerId);
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;

  return items.filter((item) => {
    if (item.target.latitude === null || item.target.longitude === null) return false;
    const latitudeDelta = toRadians(item.target.latitude - latitude);
    const longitudeDelta = toRadians(item.target.longitude - longitude);
    const startLatitude = toRadians(latitude);
    const targetLatitude = toRadians(item.target.latitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(startLatitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
    const distance = 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
    return distance <= radiusMiles;
  });
}
export async function blasts(viewerId?: string) {
  await ensureSocialBootstrap();
  const rows = await db.select().from(blastsTable).orderBy(desc(blastsTable.createdAt));
  if (!rows.length) return [];
  const blastIds = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.userId))];
  const targetIds = [...new Set(rows.map((row) => row.targetId))];
  const [
    authors, targetRows, targetCounts, reactions, commentCounts, followerCounts,
    followingCounts, authorBlastCounts, viewerReactions, viewerBookmarks, viewerFollows,
  ] = await Promise.all([
    db.select().from(usersTable).where(inArray(usersTable.id, authorIds)),
    db.select().from(targetsTable).where(inArray(targetsTable.id, targetIds)),
    db.select({ id: blastsTable.targetId, count: sql<number>`count(*)::int` }).from(blastsTable).where(inArray(blastsTable.targetId, targetIds)).groupBy(blastsTable.targetId),
    db.select({ id: reactionsTable.blastId, type: reactionsTable.reactionType, count: sql<number>`count(*)::int` }).from(reactionsTable).where(inArray(reactionsTable.blastId, blastIds)).groupBy(reactionsTable.blastId, reactionsTable.reactionType),
    db.select({ id: commentsTable.blastId, count: sql<number>`count(*)::int` }).from(commentsTable).where(inArray(commentsTable.blastId, blastIds)).groupBy(commentsTable.blastId),
    db.select({ id: followsTable.followingId, count: sql<number>`count(*)::int` }).from(followsTable).where(inArray(followsTable.followingId, authorIds)).groupBy(followsTable.followingId),
    db.select({ id: followsTable.followerId, count: sql<number>`count(*)::int` }).from(followsTable).where(inArray(followsTable.followerId, authorIds)).groupBy(followsTable.followerId),
    db.select({ id: blastsTable.userId, count: sql<number>`count(*)::int` }).from(blastsTable).where(inArray(blastsTable.userId, authorIds)).groupBy(blastsTable.userId),
    viewerId ? db.select().from(reactionsTable).where(and(eq(reactionsTable.userId, viewerId), inArray(reactionsTable.blastId, blastIds))) : Promise.resolve([]),
    viewerId ? db.select().from(bookmarksTable).where(and(eq(bookmarksTable.userId, viewerId), inArray(bookmarksTable.blastId, blastIds))) : Promise.resolve([]),
    viewerId ? db.select().from(followsTable).where(and(eq(followsTable.followerId, viewerId), inArray(followsTable.followingId, authorIds))) : Promise.resolve([]),
  ]);
  const map = <T extends { id: string }>(values: T[]) => new Map(values.map((value) => [value.id, value]));
  const authorById = map(authors);
  const targetById = map(targetRows);
  const targetCountById = new Map(targetCounts.map((row) => [row.id, row.count]));
  const commentsById = new Map(commentCounts.map((row) => [row.id, row.count]));
  const followersById = new Map(followerCounts.map((row) => [row.id, row.count]));
  const followingById = new Map(followingCounts.map((row) => [row.id, row.count]));
  const blastCountById = new Map(authorBlastCounts.map((row) => [row.id, row.count]));
  const reactionsByBlast = new Map<string, Record<Reaction, number>>();
  for (const row of reactions) {
    const reaction = reactionsByBlast.get(row.id) ?? { blast: 0, facts: 0, cap: 0, funny: 0, watching: 0 };
    if (row.type in reaction) reaction[row.type as Reaction] = row.count;
    reactionsByBlast.set(row.id, reaction);
  }
  const reactionByBlast = new Map(viewerReactions.map((row) => [row.blastId, row.reactionType as Reaction]));
  const bookmarked = new Set(viewerBookmarks.map((row) => row.blastId));
  const followed = new Set(viewerFollows.map((row) => row.followingId));
  const authorMediaById = new Map(await Promise.all(authors.map(async (author) => {
    const [avatarUrl, coverUrl] = await Promise.all([
      readableProfileMedia(author.avatarUrl, author.authId, "avatar"),
      readableProfileMedia(author.coverUrl, author.authId, "banner"),
    ]);
    return [author.id, { avatarUrl, coverUrl }] as const;
  })));
  return rows.map((blast) => {
    const author = authorById.get(blast.userId);
    const target = targetById.get(blast.targetId);
    if (!author || !target) throw new Error("Invalid social relation");
    const authorMedia = authorMediaById.get(author.id) ?? { avatarUrl: "", coverUrl: "" };
    return {
      id: blast.id, content: blast.content, createdAt: blast.createdAt.toISOString(),
      author: { id: author.id, username: author.username, displayName: author.displayName, ...authorMedia, bio: author.bio, location: author.location, city: author.city, state: author.state, joinedAt: author.createdAt.toISOString(), followers: followersById.get(author.id) ?? 0, following: followingById.get(author.id) ?? 0, blastCount: blastCountById.get(author.id) ?? 0, isFollowing: followed.has(author.id) },
      target: { ...target, type: target.type as SocialTarget["type"], blastCount: targetCountById.get(target.id) ?? 0 },
      location: blast.location, mediaUrl: blast.mediaUrl, mediaType: blast.mediaType as "image" | "video" | null,
      reactions: { ...(reactionsByBlast.get(blast.id) ?? { blast: 0, facts: 0, cap: 0, funny: 0, watching: 0 }), currentUserReaction: reactionByBlast.get(blast.id) ?? null },
      commentCount: commentsById.get(blast.id) ?? 0, shareCount: blast.shareCount, viewCount: blast.viewCount,
      isBookmarked: bookmarked.has(blast.id), isBlastBack: !!blast.originalBlastId, originalBlastId: blast.originalBlastId,
      allowClipCreation: blast.allowClipCreation, allowExternalSharing: blast.allowExternalSharing, allowPromotionalUse: blast.allowPromotionalUse,
    };
  });
}
export async function blastById(id: string, viewerId?: string) {
  return (await blasts(viewerId)).find((blast) => blast.id === id);
}
export async function createBlast(input: { userId: string; targetId: string; content: string; location: string; mediaUrl?: string; mediaType?: "image" | "video"; originalBlastId?: string }) { const [row] = await db.insert(blastsTable).values({ id: randomUUID(), ...input, mediaUrl: input.mediaUrl ?? "", mediaType: input.mediaType ?? null, viewCount: 1 }).returning(); if (!row) throw new Error("Unable to create Blast"); return row; }
async function lockToggle(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], key: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}
export async function toggleFollow(followerId: string, followingId: string) { return db.transaction(async tx => { await lockToggle(tx, `follow:${followerId}:${followingId}`); const existing = await tx.select().from(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId))); if (existing.length) { await tx.delete(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId))); return false; } await tx.insert(followsTable).values({ followerId, followingId }); return true; }); }
export async function toggleBookmark(userId: string, blastId: string) { return db.transaction(async tx => { await lockToggle(tx, `bookmark:${userId}:${blastId}`); const x = await tx.select().from(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.blastId, blastId))); if (x.length) { await tx.delete(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.blastId, blastId))); return false; } await tx.insert(bookmarksTable).values({ userId, blastId }); return true; }); }
export async function toggleReaction(userId: string, blastId: string, type: Reaction) { await db.transaction(async tx => { await lockToggle(tx, `reaction:${userId}:${blastId}`); const [old] = await tx.select().from(reactionsTable).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.blastId, blastId))); if (old?.reactionType === type) await tx.delete(reactionsTable).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.blastId, blastId))); else if (old) await tx.update(reactionsTable).set({ reactionType: type }).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.blastId, blastId))); else await tx.insert(reactionsTable).values({ userId, blastId, reactionType: type }); }); return (await blasts(userId)).find(b => b.id === blastId)?.reactions; }
export async function addComment(userId: string, blastId: string, content: string) { const [row] = await db.insert(commentsTable).values({ id: randomUUID(), userId, blastId, content }).returning(); return row; }
export async function toggleBlock(blockerId: string, blockedId: string) { return db.transaction(async tx => { await lockToggle(tx, `block:${blockerId}:${blockedId}`); const old = await tx.select().from(blocksTable).where(and(eq(blocksTable.blockerId, blockerId), eq(blocksTable.blockedId, blockedId))); if (old.length) { await tx.delete(blocksTable).where(and(eq(blocksTable.blockerId, blockerId), eq(blocksTable.blockedId, blockedId))); return false; } await tx.insert(blocksTable).values({ blockerId, blockedId }); return true; }); }
export async function notifications(userId: string) { const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)).orderBy(desc(notificationsTable.createdAt)); return Promise.all(rows.map(async n => { const actor = await db.select().from(usersTable).where(eq(usersTable.id, n.actorId)); return { ...n, createdAt: n.createdAt.toISOString(), actor: await profile(actor[0]!, userId) }; })); }
export async function createReport(input: { reporterId: string; targetType: string; targetId: string; reason: string; description: string }) {
  return db.transaction(async tx => {
    const [row] = await tx.insert(reportsTable).values({ id: randomUUID(), ...input }).returning();
    if (!row) throw new Error("Unable to create report");
    const [adminReport] = await tx.insert(adminReportsTable).values({
      id: row.id,
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description,
    }).returning();
    if (!adminReport) throw new Error("Unable to create moderation report");
    await tx.insert(adminAuditEventsTable).values({
      action: "report_created",
      entityType: input.targetType,
      entityId: input.targetId,
      actorId: input.reporterId,
      details: `Report opened for ${input.reason}.`,
    });
    return row;
  });
}