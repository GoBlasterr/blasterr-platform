import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { cmsEntriesTable, db, mediaAssetsTable } from "@workspace/db";
import { isActiveAdmin, isSuspended } from "../lib/admin-auth";
import { emitCmsEvent, subscribeCmsEvents } from "../lib/cms-events";
import {
  CMS_TYPES, CMS_STATUSES, createCmsEntry, deleteCmsEntry, getCmsEntry, getCmsSettings,
  listCmsEntries, listPublishedCms, updateCmsEntry, updateCmsSettings,
} from "../lib/cms-repository";

const router: IRouter = Router();

async function requireCmsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Authentication required." }); return; }
  try {
    const user = await clerkClient.users.getUser(userId);
    const metadata = user.publicMetadata as Record<string, unknown>;
    if (isSuspended(metadata)) { res.status(403).json({ error: "This account is suspended." }); return; }
    if (!isActiveAdmin(metadata)) { res.status(403).json({ error: "Admin access required." }); return; }
    res.locals.cmsActorId = userId;
    next();
  } catch (error) {
    req.log.warn({ err: error }, "Unable to authorize CMS request");
    res.status(403).json({ error: "Admin access required." });
  }
}

function actorId(res: Response) { return typeof res.locals.cmsActorId === "string" ? res.locals.cmsActorId : "unknown-admin"; }
function safePublicUrl(value: string): string {
  const trimmed = value.trim().slice(0, 1000);
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try { return new URL(trimmed).protocol === "https:" ? trimmed : ""; } catch { return ""; }
}
function sanitizeValue(key: string, value: unknown): unknown {
  if (typeof value === "string") return /(?:url|href|link)$/i.test(key) ? safePublicUrl(value) : value.slice(0, 10_000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeValue(key, item));
  if (value && typeof value === "object") return validBody(value);
  return value;
}
function validBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 80).map(([key, item]) => [key, sanitizeValue(key, item)]));
}
function input(body: Record<string, unknown>, actor: string, partial = false) {
  const result: Record<string, unknown> = { actorId: actor };
  const assign = (key: string, value: unknown, fallback: unknown) => {
    if (!partial || Object.hasOwn(body, key)) result[key] = value ?? fallback;
  };
  assign("type", typeof body.type === "string" ? body.type : undefined, "page");
  assign("slug", typeof body.slug === "string" ? body.slug : undefined, undefined);
  assign("title", typeof body.title === "string" ? body.title : undefined, "");
  assign("excerpt", typeof body.excerpt === "string" ? body.excerpt : undefined, "");
  assign("body", body.body === undefined ? undefined : validBody(body.body), {});
  assign("seoTitle", typeof body.seoTitle === "string" ? body.seoTitle : undefined, "");
  assign("seoDescription", typeof body.seoDescription === "string" ? body.seoDescription : undefined, "");
  assign("featuredImage", typeof body.featuredImage === "string" ? safePublicUrl(body.featuredImage) : undefined, "");
  assign("status", typeof body.status === "string" ? body.status : undefined, "draft");
  assign("publishAt", typeof body.publishAt === "string" ? body.publishAt : body.publishAt === null ? null : undefined, null);
  return result;
}

router.get("/public/entries", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json(await listPublishedCms(type));
});
router.get("/public/entries/:slug", async (req, res) => {
  const entry = await getCmsEntry(req.params.slug, true);
  if (!entry) { res.status(404).json({ error: "Published page not found." }); return; }
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json(entry);
});
router.get("/public/settings", async (_req, res) => {
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json(await getCmsSettings());
});
router.get("/events", (req, res) => {
  res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  res.write(`event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  const unsubscribe = subscribeCmsEvents((event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);
  req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
});

router.use("/admin", requireCmsAdmin);
router.get("/admin/meta", (_req, res) => res.json({ types: CMS_TYPES, statuses: CMS_STATUSES }));
router.get("/admin/entries", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  res.json(await listCmsEntries({ type, status }));
});
router.get("/admin/entries/:id", async (req, res) => {
  const entry = await getCmsEntry(req.params.id);
  if (!entry) { res.status(404).json({ error: "CMS entry not found." }); return; }
  res.json(entry);
});
router.post("/admin/entries", async (req, res) => {
  const payload = input(req.body ?? {}, actorId(res)) as Parameters<typeof createCmsEntry>[0];
  if (!payload.title.trim()) { res.status(400).json({ error: "A title is required." }); return; }
  if (!CMS_TYPES.includes(payload.type as never) || !CMS_STATUSES.includes(payload.status as never)) { res.status(400).json({ error: "Invalid CMS type or status." }); return; }
  try {
    const entry = await createCmsEntry(payload);
    emitCmsEvent({ type: "cms.updated", entryType: entry.type, id: entry.id });
    res.status(201).json(entry);
  } catch (error) {
    req.log.warn({ err: error }, "Unable to create CMS entry");
    res.status(409).json({ error: "An entry with that type and slug already exists." });
  }
});
router.patch("/admin/entries/:id", async (req, res) => {
  const payload = input(req.body ?? {}, actorId(res), true) as Parameters<typeof updateCmsEntry>[1];
  try {
    const entry = await updateCmsEntry(req.params.id, payload);
    if (!entry) { res.status(404).json({ error: "CMS entry not found." }); return; }
    emitCmsEvent({ type: "cms.updated", entryType: entry.type, id: entry.id });
    res.json(entry);
  } catch (error) {
    req.log.warn({ err: error }, "Unable to update CMS entry");
    res.status(409).json({ error: "Unable to save CMS entry. Check its slug and fields." });
  }
});
router.delete("/admin/entries/:id", async (req, res) => {
  const deleted = await deleteCmsEntry(req.params.id);
  if (!deleted) { res.status(404).json({ error: "CMS entry not found." }); return; }
  emitCmsEvent({ type: "cms.updated", id: req.params.id });
  res.status(204).end();
});
router.get("/admin/settings", async (_req, res) => res.json(await getCmsSettings()));
router.patch("/admin/settings", async (req, res) => {
  const settings = validBody(req.body);
  const saved = await updateCmsSettings(Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, validBody(value)])), actorId(res));
  emitCmsEvent({ type: "cms.updated", entryType: "settings" });
  res.json(saved);
});
router.get("/admin/media", async (_req, res) => {
  const rows = await db.select().from(mediaAssetsTable).orderBy(desc(mediaAssetsTable.createdAt));
  res.json(rows.map((row) => ({ ...row, url: `/api/storage/objects/${row.objectKey}`, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })));
});
router.patch("/admin/media/:id", async (req, res) => {
  const featuredImage = typeof req.body?.featuredImage === "string" ? req.body.featuredImage.slice(0, 1000) : "";
  const [row] = await db.update(mediaAssetsTable).set({ resourceType: "cms", resourceId: featuredImage, updatedAt: new Date() }).where(eq(mediaAssetsTable.id, req.params.id)).returning();
  if (!row) { res.status(404).json({ error: "Media asset not found." }); return; }
  res.json(row);
});

export default router;