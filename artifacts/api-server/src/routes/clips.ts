import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateClipBody,
  CreateClipResponse,
  DeleteClipParams,
  GetAdminClipsResponse,
  GetClipParams,
  GetClipResponse,
  GetMyClipsQueryParams,
  GetMyClipsResponse,
  RetryClipParams,
  RetryClipResponse,
  ShareClipParams,
  ShareClipResponse,
  UpdateClipBody,
  UpdateClipParams,
  UpdateClipResponse,
} from "@workspace/api-zod";
import { renderClip } from "../lib/clip-renderer";
import { isActiveAdmin, isSuspended } from "../lib/admin-auth";
import { getPrivateObjectPath, getSignedObjectUrl } from "./storage";
import { adminFeatureFlags, recordAudit } from "../lib/admin-state";
import {
  createClip, deleteClip, findBlast, getClip, listClips, updateClip,
  type ClipSettings, type PersistedClip,
} from "../lib/clip-repository";
import { devViewer, syncClerkUser, userByAuth } from "../lib/social-repository";

const router: IRouter = Router();
type Style = "BREAKING" | "FUNNY" | "DRAMATIC" | "RECEIPTS" | "DEBATE" | "STORY";

async function viewer(req: Request): Promise<{ id: string | null; admin: boolean }> {
  const { userId } = getAuth(req);
  if (!userId) {
    if (process.env.NODE_ENV !== "development") return { id: null, admin: false };
    return { id: (await devViewer()).id, admin: false };
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const meta = user.publicMetadata as Record<string, unknown>;
    if (isSuspended(meta)) return { id: null, admin: false };
    let socialUser = await userByAuth(userId);
    if (!socialUser) {
      socialUser = await syncClerkUser({
        authId: userId,
        username: typeof meta.username === "string" ? meta.username : user.username ?? `user_${userId.replace(/\W/g, "").slice(-20)}`,
        displayName: typeof meta.displayName === "string" ? meta.displayName : user.fullName ?? user.username ?? "BLASTERR user",
        email: user.emailAddresses[0]?.emailAddress ?? `${userId}@clerk.invalid`,
        bio: typeof meta.bio === "string" ? meta.bio : "",
        avatarUrl: typeof meta.avatarUrl === "string" ? meta.avatarUrl : user.imageUrl ?? "",
        coverUrl: typeof meta.coverUrl === "string" ? meta.coverUrl : "",
        location: typeof meta.location === "string" ? meta.location : "",
        city: typeof meta.city === "string" ? meta.city : "",
        state: typeof meta.state === "string" ? meta.state : "",
      });
    }
    return { id: socialUser.id, admin: isActiveAdmin(meta) };
  } catch {
    return { id: null, admin: false };
  }
}

const payload = (clip: PersistedClip) => ({
  ...clip,
  errorMessage: clip.errorMessage ?? null,
});
const canManage = (clip: PersistedClip, user: { id: string | null; admin: boolean }) =>
  user.admin || (!!user.id && clip.creatorId === user.id);
const fallbackTitle = (blast: PersistedClip["blast"], style: Style) =>
  `${style[0]}${style.slice(1).toLowerCase()} Blast: ${blast.target.name}`;

async function upload(path: string, objectName: string, contentType: string): Promise<string> {
  const { bucketName, prefix } = getPrivateObjectPath();
  const signed = await getSignedObjectUrl({
    bucketName,
    objectName: [prefix, objectName].filter(Boolean).join("/"),
    method: "PUT",
  });
  const response = await fetch(signed, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: await readFile(path),
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return `/api/storage/objects/${objectName}`;
}

async function processClip(id: string): Promise<void> {
  const clip = await getClip(id);
  if (!clip || clip.renderStatus !== "QUEUED") return;
  await updateClip(id, { renderStatus: "PROCESSING", errorMessage: null });
  const dir = join(tmpdir(), "blasterr-clips", clip.id);
  const output = join(dir, "clip.mp4");
  const thumbnail = join(dir, "thumbnail.jpg");
  try {
    await mkdir(dir, { recursive: true });
    await renderClip({
      output, thumbnail, duration: clip.duration, style: clip.style,
      title: clip.title, content: clip.blast.content, creator: clip.creator.username,
      target: clip.blast.target.name, cta: clip.settings.ctaText,
      position: clip.settings.captionPosition, background: clip.settings.background,
    });
    const videoUrl = await upload(output, `clips/${clip.id}/clip.mp4`, "video/mp4");
    const thumbnailUrl = await upload(thumbnail, `clips/${clip.id}/thumbnail.jpg`, "image/jpeg");
    await updateClip(id, { videoUrl, thumbnailUrl, renderStatus: "COMPLETED", errorMessage: null });
  } catch {
    await updateClip(id, { renderStatus: "FAILED", errorMessage: "We couldn't finish your BLASTR Clip. Try again." });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
const queue = (id: string) => setTimeout(() => void processClip(id), 25);

router.get("/clips", async (req, res): Promise<void> => {
  const user = await viewer(req);
  if (!user.id) return void res.status(401).json({ error: "Sign in is required." });
  const query = GetMyClipsQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: "Invalid clip status." });
  const filtered = await listClips(user.id, query.data.status === "all" ? undefined : query.data.status);
  res.json(GetMyClipsResponse.parse(filtered.map(payload)));
});

router.get("/admin/clips", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const developmentBypass = process.env.NODE_ENV === "development" && process.env.DEV_ADMIN_BYPASS === "true";
  if (!userId && !developmentBypass) return void res.status(401).json({ error: "Authentication required." });
  let admin = developmentBypass;
  if (userId) {
    try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const metadata = clerkUser.publicMetadata as Record<string, unknown>;
    if (isSuspended(metadata)) return void res.status(403).json({ error: "This account is suspended." });
    admin = isActiveAdmin(metadata);
    } catch {
      return void res.status(403).json({ error: "Admin access is required." });
    }
  }
  if (!admin) return void res.status(403).json({ error: "Admin access is required." });
  const clips = await listClips();
  res.json(GetAdminClipsResponse.parse({
    clipCount: clips.length, completedCount: clips.filter((clip) => ["COMPLETED", "SHARED"].includes(clip.renderStatus)).length,
    failedCount: clips.filter((clip) => clip.renderStatus === "FAILED").length, activeRenders: clips.filter((clip) => ["QUEUED", "PROCESSING"].includes(clip.renderStatus)).length,
    clips: clips.map(payload),
  }));
});

router.post("/clips", async (req, res): Promise<void> => {
  if (!adminFeatureFlags.find((feature) => feature.key === "clip_creation")?.enabled) {
    res.status(403).json({ error: "Clip creation is currently disabled." });
    return;
  }
  const user = await viewer(req);
  if (!user.id) return void res.status(401).json({ error: "Sign in is required." });
  const body = CreateClipBody.safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Invalid clip settings." });
  const blast = await findBlast(body.data.blastId);
  if (!blast) return void res.status(404).json({ error: "Blast not found." });
  const owner = blast.author.id === user.id;
  if (!owner && !user.admin) return void res.status(403).json({ error: "You can only clip Blasts you own." });
  if (blast.allowClipCreation === false || (user.admin && !owner && blast.allowPromotionalUse !== true)) {
    return void res.status(403).json({ error: "This Blast is not approved for clips." });
  }
  const style = body.data.style as Style;
  const clip = await createClip({
    id: `clip-${randomUUID()}`, blastId: blast.id, creatorId: user.id,
    style, title: body.data.title?.trim() || fallbackTitle(blast, style),
    description: body.data.description?.trim() || `A BLASTR Clip about ${blast.target.name}.`,
    duration: body.data.duration ?? 30, aspectRatio: "9:16", renderStatus: "QUEUED",
    videoUrl: null, thumbnailUrl: null, errorMessage: null,
    settings: {
      captionStyle: body.data.captionStyle ?? "bold",
      captionPosition: body.data.captionPosition ?? "center",
      captionAnimation: body.data.captionAnimation ?? "pop",
      background: body.data.background ?? "cosmic",
      brandingStyle: body.data.brandingStyle ?? "full",
      ctaText: body.data.ctaText?.trim() || "See the full Blast on BLASTERR",
    },
  });
  if (user.admin && !owner) {
    await recordAudit({
      action: "clip_created_for_user",
      entityType: "clip",
      entityId: clip.id,
      actorId: user.id,
      details: `Created a Clip from Blast ${blast.id} owned by another user.`,
    });
  }
  queue(clip.id);
  res.status(201).json(CreateClipResponse.parse(payload(clip)));
});

router.get("/clips/:id", async (req, res): Promise<void> => {
  const params = GetClipParams.safeParse(req.params);
  const clip = params.success ? await getClip(params.data.id) : null;
  if (!clip) return void res.status(404).json({ error: "Clip not found." });
  if (!canManage(clip, await viewer(req))) return void res.status(403).json({ error: "Access denied." });
  res.json(GetClipResponse.parse(payload(clip)));
});

router.patch("/clips/:id", async (req, res): Promise<void> => {
  const params = UpdateClipParams.safeParse(req.params);
  const body = UpdateClipBody.safeParse(req.body);
  const clip = params.success ? await getClip(params.data.id) : null;
  if (!clip) return void res.status(404).json({ error: "Clip not found." });
  if (!body.success) return void res.status(400).json({ error: "Invalid clip settings." });
  const user = await viewer(req);
  if (!canManage(clip, user)) return void res.status(403).json({ error: "Access denied." });
  if (["QUEUED", "PROCESSING"].includes(clip.renderStatus)) {
    return void res.status(409).json({ error: "Wait for this render to finish." });
  }
  const update = body.data;
  if (user.admin && clip.creatorId !== user.id) {
    await recordAudit({
      action: "clip_update_requested",
      entityType: "clip",
      entityId: clip.id,
      actorId: user.id!,
      details: `Requested Clip changes: ${JSON.stringify(update)}.`,
    });
  }
  const settings: Partial<ClipSettings> = {
    captionStyle: update.captionStyle ?? clip.settings.captionStyle,
    captionPosition: update.captionPosition ?? clip.settings.captionPosition,
    captionAnimation: update.captionAnimation ?? clip.settings.captionAnimation,
    background: update.background ?? clip.settings.background,
    brandingStyle: update.brandingStyle ?? clip.settings.brandingStyle,
    ctaText: update.ctaText?.trim() || clip.settings.ctaText,
  };
  const saved = await updateClip(clip.id, {
    title: update.title?.trim() || clip.title, description: update.description?.trim() ?? clip.description,
    duration: update.duration ?? clip.duration, settings, renderStatus: "DRAFT", videoUrl: null, thumbnailUrl: null,
  });
  res.json(UpdateClipResponse.parse(payload(saved!)));
});

router.delete("/clips/:id", async (req, res): Promise<void> => {
  const params = DeleteClipParams.safeParse(req.params);
  const clip = params.success ? await getClip(params.data.id) : null;
  if (!clip) return void res.status(404).json({ error: "Clip not found." });
  const user = await viewer(req);
  if (!user.id || clip.creatorId !== user.id) {
    return void res.status(403).json({ error: "Only the creator can delete this clip." });
  }
  await deleteClip(clip.id);
  res.sendStatus(204);
});

router.post("/clips/:id/retry", async (req, res): Promise<void> => {
  const params = RetryClipParams.safeParse(req.params);
  const clip = params.success ? await getClip(params.data.id) : null;
  if (!clip) return void res.status(404).json({ error: "Clip not found." });
  const user = await viewer(req);
  if (!canManage(clip, user)) return void res.status(403).json({ error: "Access denied." });
  if (clip.renderStatus !== "FAILED") return void res.status(409).json({ error: "Only failed clips can retry." });
  if (user.admin && clip.creatorId !== user.id) {
    await recordAudit({
      action: "clip_retry_requested",
      entityType: "clip",
      entityId: clip.id,
      actorId: user.id!,
      details: "Retried another user's failed Clip render.",
    });
  }
  const saved = await updateClip(clip.id, { renderStatus: "QUEUED", errorMessage: null });
  queue(clip.id);
  res.json(RetryClipResponse.parse(payload(saved!)));
});

router.post("/clips/:id/share", async (req, res): Promise<void> => {
  const params = ShareClipParams.safeParse(req.params);
  const clip = params.success ? await getClip(params.data.id) : null;
  if (!clip) return void res.status(404).json({ error: "Clip not found." });
  const user = await viewer(req);
  if (!canManage(clip, user)) return void res.status(403).json({ error: "Access denied." });
  if (!["COMPLETED", "SHARED"].includes(clip.renderStatus)) {
    return void res.status(409).json({ error: "This clip is not ready to share." });
  }
  if (clip.blast.allowExternalSharing !== true) {
    return void res.status(403).json({ error: "External sharing is not approved." });
  }
  if (!clip.videoUrl) {
    return void res.status(409).json({ error: "This clip has no exported video." });
  }
  if (user.admin && clip.creatorId !== user.id) {
    await recordAudit({
      action: "clip_shared",
      entityType: "clip",
      entityId: clip.id,
      actorId: user.id!,
      details: "Shared another user's Clip externally.",
    });
  }
  await updateClip(clip.id, { renderStatus: "SHARED" });
  res.json(ShareClipResponse.parse({ url: clip.videoUrl }));
});

export default router;