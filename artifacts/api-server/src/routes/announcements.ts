import { clerkClient, getAuth } from "@clerk/express";
import { GetAnnouncementsResponse } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  getPublishedAnnouncementsForViewer,
  type AnnouncementViewerRole,
} from "../lib/admin-state";
import { resolveAnnouncementViewerRole } from "../lib/announcement-visibility";

const router: IRouter = Router();

async function viewerRole(req: Request, res: Response): Promise<AnnouncementViewerRole | null> {
  const { userId } = getAuth(req);
  if (!userId) return "user";

  try {
    const user = await clerkClient.users.getUser(userId);
    const metadata = user.publicMetadata as Record<string, unknown>;
    return resolveAnnouncementViewerRole(metadata);
  } catch (error) {
    req.log.warn({ err: error, userId }, "Unable to authorize announcement request");
    res.status(401).json({ error: "Unable to verify account." });
    return null;
  }
}

router.get("/announcements", async (req, res): Promise<void> => {
  res.set("Cache-Control", "private, no-store, max-age=0");
  res.set("Vary", "Cookie, Authorization");

  const role = await viewerRole(req, res);
  if (!role) return;

  res.json(GetAnnouncementsResponse.parse(getPublishedAnnouncementsForViewer(role)));
});

export default router;