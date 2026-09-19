import { and, eq, desc } from "drizzle-orm";
import { db, mediaAssetsTable, type MediaAssetRow } from "@workspace/db";

export async function createPendingMedia(input: {
  id: string;
  ownerId: string;
  bucket: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
  visibility?: "public" | "private";
}): Promise<MediaAssetRow> {
  const [row] = await db.insert(mediaAssetsTable).values({
    ...input,
    visibility: input.visibility ?? "public",
    lifecycleStatus: "pending",
  }).returning();
  if (!row) throw new Error("Unable to register media asset.");
  return row;
}

export async function createReadyMedia(input: {
  id: string;
  ownerId: string;
  bucket: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
  resourceType?: string;
  resourceId?: string;
}): Promise<MediaAssetRow> {
  const [row] = await db.insert(mediaAssetsTable).values({
    ...input,
    visibility: "public",
    lifecycleStatus: "ready",
  }).returning();
  if (!row) throw new Error("Unable to register media asset.");
  return row;
}

export async function markMediaReady(id: string, ownerAuthId: string): Promise<MediaAssetRow | null> {
  const [row] = await db.update(mediaAssetsTable)
    .set({ lifecycleStatus: "ready", updatedAt: new Date() })
    .where(and(eq(mediaAssetsTable.id, id), eq(mediaAssetsTable.ownerId, ownerAuthId)))
    .returning();
  return row ?? null;
}

export async function markMediaFailed(id: string, ownerAuthId: string): Promise<void> {
  await db.update(mediaAssetsTable)
    .set({ lifecycleStatus: "failed", updatedAt: new Date() })
    .where(and(eq(mediaAssetsTable.id, id), eq(mediaAssetsTable.ownerId, ownerAuthId)));
}

export async function mediaById(id: string): Promise<MediaAssetRow | null> {
  const [row] = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.id, id)).limit(1);
  return row ?? null;
}

export async function mediaByObjectKey(objectKey: string): Promise<MediaAssetRow | null> {
  const [row] = await db.select().from(mediaAssetsTable).where(eq(mediaAssetsTable.objectKey, objectKey)).limit(1);
  return row ?? null;
}

export async function deleteMediaMetadata(id: string, ownerAuthId?: string): Promise<MediaAssetRow | null> {
  const [row] = await db.update(mediaAssetsTable)
    .set({ lifecycleStatus: "deleted", updatedAt: new Date() })
    .where(ownerAuthId
      ? and(eq(mediaAssetsTable.id, id), eq(mediaAssetsTable.ownerId, ownerAuthId))
      : eq(mediaAssetsTable.id, id))
    .returning();
  return row ?? null;
}

export async function claimMediaForDeletion(id: string, ownerAuthId: string): Promise<{ asset: MediaAssetRow; previousStatus: string } | null> {
  const current = await mediaById(id);
  if (!current || current.ownerId !== ownerAuthId || !["pending", "ready"].includes(current.lifecycleStatus)) return null;
  const [claimed] = await db.update(mediaAssetsTable)
    .set({ lifecycleStatus: "failed", updatedAt: new Date() })
    .where(and(eq(mediaAssetsTable.id, id), eq(mediaAssetsTable.ownerId, ownerAuthId), eq(mediaAssetsTable.lifecycleStatus, current.lifecycleStatus)))
    .returning();
  return claimed ? { asset: claimed, previousStatus: current.lifecycleStatus } : null;
}

export async function restoreClaimedMedia(id: string, ownerAuthId: string, status: string): Promise<void> {
  await db.update(mediaAssetsTable).set({ lifecycleStatus: status, updatedAt: new Date() })
    .where(and(eq(mediaAssetsTable.id, id), eq(mediaAssetsTable.ownerId, ownerAuthId), eq(mediaAssetsTable.lifecycleStatus, "failed")));
}

export async function listMediaAssets(limit = 100): Promise<MediaAssetRow[]> {
  return db.select().from(mediaAssetsTable).orderBy(desc(mediaAssetsTable.createdAt)).limit(limit);
}