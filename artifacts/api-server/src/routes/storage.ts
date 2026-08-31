import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import {
  buildMediaObjectKey,
  checkR2Connection,
  deleteR2Object,
  getR2Config,
  headR2Object,
  keyFromObjectPath,
  objectPathForKey,
  presignDownload,
  presignUpload,
} from "../lib/r2";
import {
  createPendingMedia,
  deleteMediaMetadata,
  markMediaFailed,
  markMediaReady,
  mediaById,
} from "../lib/media-repository";

const router: IRouter = Router();
const signedGetUrlCache = new Map<string, { url: string; expiresAt: number }>();
const signedGetUrlRequests = new Map<string, Promise<string>>();

export function getPrivateObjectPath(): { bucketName: string; prefix: string } {
  const config = getR2Config();
  return { bucketName: config.bucket, prefix: "" };
}

export async function getSignedObjectUrl({
  bucketName: _bucketName,
  objectName,
  method,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT";
}): Promise<string> {
  const cacheKey = objectName;
  if (method === "GET") {
    const cached = signedGetUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    const pending = signedGetUrlRequests.get(cacheKey);
    if (pending) return pending;
  }

  const request = method === "GET"
    ? presignDownload({ key: objectName })
    : presignUpload({ key: objectName });
  if (method === "GET") signedGetUrlRequests.set(cacheKey, request);

  try {
    const url = await request;
    if (method === "GET") {
      signedGetUrlCache.set(cacheKey, { url, expiresAt: Date.now() + 10 * 60 * 1000 });
    }
    return url;
  } finally {
    if (method === "GET") signedGetUrlRequests.delete(cacheKey);
  }
}

function authenticatedOwner(req: Request): string | null {
  const { userId } = getAuth(req);
  if (userId) return userId;
  return process.env.NODE_ENV === "development" ? "demo-preview-user" : null;
}

function uploadPurpose(value: unknown): "avatar" | "banner" | "target-image" | "blast-media" | "clip-asset" | "general" {
  return value === "avatar" || value === "banner" || value === "target-image" ||
    value === "blast-media" || value === "clip-asset" ? value : "general";
}

function allowedUpload(contentType: unknown, purpose: string, size: unknown): { valid: boolean; message: string } {
  const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  const isImage = typeof contentType === "string" && allowedImageTypes.has(contentType);
  const isVideo = typeof contentType === "string" && allowedVideoTypes.has(contentType);
  const maxUploadSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  const valid = typeof size === "number" && Number.isSafeInteger(size) && size > 0 &&
    size <= maxUploadSize && (isImage || (isVideo && (purpose === "blast-media" || purpose === "clip-asset")));
  return {
    valid,
    message: purpose === "blast-media"
      ? "Upload a JPG, PNG, WebP, GIF up to 10 MB or an MP4, WebM, MOV up to 100 MB."
      : "Upload an image up to 10 MB.",
  };
}

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const ownerId = authenticatedOwner(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign in is required before uploading files." });
    return;
  }

  const { name, size, contentType } = req.body ?? {};
  const purpose = uploadPurpose(req.body?.purpose);
  const validation = allowedUpload(contentType, purpose, size);
  if (typeof name !== "string" || !name.trim() || !validation.valid || typeof contentType !== "string") {
    res.status(400).json({ error: validation.message });
    return;
  }

  const config = getR2Config();
  const objectKey = buildMediaObjectKey({ ownerId, purpose, contentType });
  try {
    const uploadURL = await presignUpload({ key: objectKey, contentType });
    const asset = await createPendingMedia({
      id: `media-${randomUUID()}`,
      ownerId,
      bucket: config.bucket,
      objectKey,
      originalName: name.trim().slice(0, 255),
      contentType,
      sizeBytes: size,
      purpose,
    });
    res.json({
      uploadURL,
      objectPath: objectPathForKey(objectKey),
      assetId: asset.id,
      provider: "cloudflare-r2",
      metadata: { name: asset.originalName, size: asset.sizeBytes, contentType: asset.contentType },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error generating R2 upload URL");
    res.status(503).json({ error: "Cloudflare R2 is unavailable right now." });
  }
});

router.post("/storage/uploads/:id/complete", async (req: Request, res: Response) => {
  const ownerId = authenticatedOwner(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign in is required to complete an upload." });
    return;
  }
  const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const asset = await mediaById(assetId);
  if (!asset || asset.ownerId !== ownerId) {
    res.status(404).json({ error: "Upload not found." });
    return;
  }
  if (asset.lifecycleStatus === "ready") {
    res.json({ assetId: asset.id, objectPath: objectPathForKey(asset.objectKey), status: "ready" });
    return;
  }
  try {
    await headR2Object(asset.objectKey);
    const ready = await markMediaReady(asset.id, ownerId);
    if (!ready) {
      res.status(409).json({ error: "Upload state changed. Please retry." });
      return;
    }
    res.json({ assetId: ready.id, objectPath: objectPathForKey(ready.objectKey), status: ready.lifecycleStatus });
  } catch (error) {
    await markMediaFailed(asset.id, ownerId);
    req.log.warn({ err: error, assetId: asset.id }, "R2 upload completion check failed");
    res.status(409).json({ error: "The uploaded object could not be verified. Please try again." });
  }
});

router.delete("/storage/uploads/:id", async (req: Request, res: Response) => {
  const ownerId = authenticatedOwner(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign in is required to delete uploads." });
    return;
  }
  const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const asset = await mediaById(assetId);
  if (!asset || asset.ownerId !== ownerId || asset.lifecycleStatus === "deleted") {
    res.status(404).json({ error: "Upload not found." });
    return;
  }
  try {
    await deleteR2Object(asset.objectKey);
    await deleteMediaMetadata(asset.id, ownerId);
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error, assetId: asset.id }, "Unable to delete R2 object");
    res.status(503).json({ error: "The media object could not be deleted. Nothing was removed from its metadata." });
  }
});

router.get("/storage/status", async (_req, res) => {
  res.json(await checkR2Connection());
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const wildcardPath = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path;
    const key = keyFromObjectPath(objectPathForKey(wildcardPath || ""));
    if (!key) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    const signedURL = await presignDownload({ key });
    res.set("Cache-Control", "public, max-age=600, immutable");
    res.redirect(signedURL);
  } catch (error) {
    req.log.error({ err: error }, "Error serving R2 object");
    res.status(404).json({ error: "Object not found" });
  }
});

export default router;