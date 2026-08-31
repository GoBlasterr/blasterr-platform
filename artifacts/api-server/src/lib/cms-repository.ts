import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lte, or } from "drizzle-orm";
import { cmsEntriesTable, cmsSettingsTable, db, type CmsEntryRow } from "@workspace/db";

export const CMS_TYPES = ["homepage", "blog", "service", "portfolio", "team", "testimonial", "faq", "contact", "page"] as const;
export const CMS_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type CmsType = typeof CMS_TYPES[number];
export type CmsStatus = typeof CMS_STATUSES[number];

function validType(value: unknown): CmsType {
  return CMS_TYPES.includes(value as CmsType) ? value as CmsType : "page";
}
function validStatus(value: unknown): CmsStatus {
  return CMS_STATUSES.includes(value as CmsStatus) ? value as CmsStatus : "draft";
}
function safeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || `entry-${randomUUID().slice(0, 8)}`;
}
function serialize(row: CmsEntryRow) {
  return { ...row, body: row.body ?? {}, publishAt: row.publishAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null };
}

export async function listCmsEntries(filters: { type?: string; status?: string } = {}) {
  const predicates = [];
  if (filters.type && CMS_TYPES.includes(filters.type as CmsType)) predicates.push(eq(cmsEntriesTable.type, filters.type));
  if (filters.status && CMS_STATUSES.includes(filters.status as CmsStatus)) predicates.push(eq(cmsEntriesTable.status, filters.status));
  const rows = await db.select().from(cmsEntriesTable).where(predicates.length ? and(...predicates) : undefined).orderBy(desc(cmsEntriesTable.updatedAt));
  return rows.map(serialize);
}

export async function getCmsEntry(idOrSlug: string, publishedOnly = false) {
  const rows = await db.select().from(cmsEntriesTable).where(or(eq(cmsEntriesTable.id, idOrSlug), eq(cmsEntriesTable.slug, idOrSlug))).limit(1);
  const row = rows[0];
  if (!row) return null;
  if (publishedOnly && !(row.status === "published" || (row.status === "scheduled" && row.publishAt && row.publishAt <= new Date()))) return null;
  return serialize(row);
}

export async function listPublishedCms(type?: string) {
  const predicates = [
    or(eq(cmsEntriesTable.status, "published"), and(eq(cmsEntriesTable.status, "scheduled"), lte(cmsEntriesTable.publishAt, new Date()))),
  ];
  if (type && CMS_TYPES.includes(type as CmsType)) predicates.push(eq(cmsEntriesTable.type, type) as never);
  const rows = await db.select().from(cmsEntriesTable).where(and(...predicates)).orderBy(asc(cmsEntriesTable.publishAt), desc(cmsEntriesTable.updatedAt));
  return rows.map(serialize);
}

export async function createCmsEntry(input: { type: string; slug?: string; title: string; excerpt?: string; body?: Record<string, unknown>; seoTitle?: string; seoDescription?: string; featuredImage?: string; status?: string; publishAt?: string | null; actorId: string }) {
  const now = new Date();
  const status = validStatus(input.status);
  const [row] = await db.insert(cmsEntriesTable).values({
    id: randomUUID(), type: validType(input.type), slug: safeSlug(input.slug || input.title), title: input.title.trim().slice(0, 200),
    excerpt: (input.excerpt ?? "").trim().slice(0, 500), body: input.body ?? {}, seoTitle: (input.seoTitle ?? "").trim().slice(0, 200),
    seoDescription: (input.seoDescription ?? "").trim().slice(0, 320), featuredImage: (input.featuredImage ?? "").trim().slice(0, 1000),
    status, publishAt: input.publishAt ? new Date(input.publishAt) : null, createdBy: input.actorId, updatedBy: input.actorId, createdAt: now, updatedAt: now,
  }).returning();
  if (!row) throw new Error("Unable to create CMS entry");
  return serialize(row);
}

export async function updateCmsEntry(id: string, input: Partial<Omit<Parameters<typeof createCmsEntry>[0], "actorId">> & { actorId: string }) {
  const patch: Record<string, unknown> = { updatedBy: input.actorId, updatedAt: new Date() };
  if (input.type !== undefined) patch.type = validType(input.type);
  if (input.slug !== undefined) patch.slug = safeSlug(input.slug);
  if (input.title !== undefined) patch.title = input.title.trim().slice(0, 200);
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt.trim().slice(0, 500);
  if (input.body !== undefined) patch.body = input.body;
  if (input.seoTitle !== undefined) patch.seoTitle = input.seoTitle.trim().slice(0, 200);
  if (input.seoDescription !== undefined) patch.seoDescription = input.seoDescription.trim().slice(0, 320);
  if (input.featuredImage !== undefined) patch.featuredImage = input.featuredImage.trim().slice(0, 1000);
  if (input.status !== undefined) patch.status = validStatus(input.status);
  if (input.publishAt !== undefined) patch.publishAt = input.publishAt ? new Date(input.publishAt) : null;
  if (patch.status === "archived") patch.archivedAt = new Date();
  if (patch.status && patch.status !== "archived") patch.archivedAt = null;
  const [row] = await db.update(cmsEntriesTable).set(patch).where(eq(cmsEntriesTable.id, id)).returning();
  return row ? serialize(row) : null;
}

export async function deleteCmsEntry(id: string) {
  const [row] = await db.update(cmsEntriesTable).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(eq(cmsEntriesTable.id, id)).returning();
  return !!row;
}

export async function getCmsSettings() {
  const rows = await db.select().from(cmsSettingsTable);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
export async function updateCmsSettings(settings: Record<string, Record<string, unknown>>, actorId: string) {
  for (const [key, value] of Object.entries(settings)) {
    await db.insert(cmsSettingsTable).values({ key, value, updatedBy: actorId, updatedAt: new Date() }).onConflictDoUpdate({ target: cmsSettingsTable.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
  }
  return getCmsSettings();
}