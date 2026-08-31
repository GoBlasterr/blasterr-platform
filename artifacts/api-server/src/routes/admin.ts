import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  CreateAdminAnnouncementBody,
  CreateAdminAnnouncementResponse,
  CreateAdminModerationActionBody,
  CreateAdminModerationActionResponse,
  DeleteAdminAnnouncementParams,
  DeleteAdminContentParams,
  DeleteAdminUserParams,
  GetAdminAnalyticsResponse,
  GetAdminAnnouncementsResponse,
  GetAdminAuditLogResponse,
  GetAdminContentQueryParams,
  GetAdminContentResponse,
  GetAdminFeaturesResponse,
  GetAdminModerationResponse,
  GetAdminReportsQueryParams,
  GetAdminReportsResponse,
  GetAdminSettingsResponse,
  GetAdminSystemResponse,
  GetAdminUsersQueryParams,
  GetAdminUsersResponse,
  UpdateAdminAnnouncementBody,
  UpdateAdminAnnouncementParams,
  UpdateAdminAnnouncementResponse,
  UpdateAdminContentBody,
  UpdateAdminContentParams,
  UpdateAdminContentResponse,
  UpdateAdminFeatureBody,
  UpdateAdminFeatureParams,
  UpdateAdminFeatureResponse,
  UpdateAdminReportBody,
  UpdateAdminReportParams,
  UpdateAdminReportResponse,
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  UpdateAdminUserResponse,
} from "@workspace/api-zod";
import {
  adminAnnouncements,
  adminContentStatuses,
  adminFeatureFlags,
  adminReports,
  adminSettings,
  auditRecords,
  createAdminAnnouncementWithAudit,
  deleteAdminAnnouncementWithAudit,
  ensureAdminState,
  getAdminReports,
  moderateAdminReportWithAudit,
  recordAudit,
  setContentStatusWithAudit,
  updateAdminAnnouncementWithAudit,
  updateAdminFeatureWithAudit,
  updateAdminReportWithAudit,
  updateAdminSettingsWithAudit,
} from "../lib/admin-state";
import { isActiveAdmin, isSuspended } from "../lib/admin-auth";
import { blasts, users } from "./social";

const router: IRouter = Router();
const startedAt = Date.now();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureAdminState();
  } catch (error) {
    req.log.error({ err: error }, "Unable to load admin state");
    res.status(503).json({ error: "Admin state is temporarily unavailable." });
    return;
  }
  const { userId } = getAuth(req);
  if (process.env.DEV_ADMIN_BYPASS === "true") {
    res.locals.adminActorId = userId ?? "development-admin";
    next();
    return;
  }
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const metadata = user.publicMetadata as Record<string, unknown>;
    if (isSuspended(metadata)) {
      res.status(403).json({ error: "This account is suspended." });
      return;
    }
    if (!isActiveAdmin(metadata)) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    res.locals.adminActorId = userId;
    next();
  } catch (error) {
    req.log.warn({ err: error, userId }, "Unable to authorize admin request");
    res.status(403).json({ error: "Admin access required." });
  }
}

router.use(requireAdmin);

function actorId(res: Response): string {
  return typeof res.locals.adminActorId === "string" ? res.locals.adminActorId : "unknown-admin";
}

function adminUser(user: Awaited<ReturnType<typeof clerkClient.users.getUser>>) {
  const metadata = user.publicMetadata as Record<string, unknown>;
  const username = user.username ?? user.primaryEmailAddress?.emailAddress.split("@")[0] ?? `user-${user.id.slice(-8)}`;
  const role = metadata.role === "admin" || metadata.role === "moderator" ? metadata.role : "user";
  return {
    id: user.id,
    username,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || username,
    avatarUrl: user.imageUrl ?? "",
    coverUrl: typeof metadata.coverUrl === "string" ? metadata.coverUrl : "",
    bio: typeof metadata.bio === "string" ? metadata.bio : "",
    location: typeof metadata.location === "string" ? metadata.location : "",
    city: typeof metadata.city === "string" ? metadata.city : "",
    state: typeof metadata.state === "string" ? metadata.state : "",
    followers: 0,
    following: 0,
    blastCount: blasts.filter((blast) => blast.author.id === user.id).length,
    joinedAt: new Date(user.createdAt).toISOString(),
    isFollowing: false,
    role,
    status: metadata.status === "suspended" ? "suspended" as const : "active" as const,
  };
}

function adminContent(
  blast: (typeof blasts)[number],
  statuses = adminContentStatuses,
  reports = adminReports,
) {
  return {
    ...blast,
    status: statuses.get(blast.id) ?? "published",
    reportCount: reports.filter((report) => report.targetType === "blast" && report.targetId === blast.id).length,
  };
}

async function reporterProfile(reporterId: string) {
  const seeded = users.find((user) => user.id === reporterId);
  if (seeded) return seeded;
  try {
    const clerkUser = await clerkClient.users.getUser(reporterId);
    const metadata = clerkUser.publicMetadata as Record<string, unknown>;
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
      || clerkUser.username
      || "BLASTERR user";
    return {
      id: reporterId,
      username: clerkUser.username ?? `user-${reporterId.slice(-8)}`,
      displayName,
      avatarUrl: clerkUser.imageUrl ?? "",
      coverUrl: typeof metadata.coverUrl === "string" ? metadata.coverUrl : "",
      bio: typeof metadata.bio === "string" ? metadata.bio : "",
      location: typeof metadata.location === "string" ? metadata.location : "",
      city: typeof metadata.city === "string" ? metadata.city : "",
      state: typeof metadata.state === "string" ? metadata.state : "",
      followers: 0,
      following: 0,
      blastCount: 0,
      joinedAt: new Date(clerkUser.createdAt).toISOString(),
      isFollowing: false,
    };
  } catch {
    return {
      id: reporterId,
      username: "unknown-user",
      displayName: "Unknown user",
      avatarUrl: "",
      coverUrl: "",
      bio: "",
      location: "",
      city: "",
      state: "",
      followers: 0,
      following: 0,
      blastCount: 0,
      joinedAt: new Date(0).toISOString(),
      isFollowing: false,
    };
  }
}

async function adminReport(report: Awaited<ReturnType<typeof getAdminReports>>[number]) {
  return {
    ...report,
    reporter: await reporterProfile(report.reporterId),
  };
}

router.get("/users", async (req, res): Promise<void> => {
  const parsed = GetAdminUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user filters." });
    return;
  }
  const query = parsed.data.q?.trim().toLowerCase();
  const { data } = await clerkClient.users.getUserList({ limit: 100 });
  const filtered = data
    .map(adminUser)
    .filter((user) => !query || `${user.username} ${user.displayName}`.toLowerCase().includes(query))
    .filter((user) => !parsed.data.status || parsed.data.status === "all" || user.status === parsed.data.status);
  res.json(GetAdminUsersResponse.parse({ users: filtered, total: filtered.length }));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  const body = UpdateAdminUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid user update." });
    return;
  }
  let user;
  try {
    user = await clerkClient.users.getUser(params.data.id);
  } catch {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const metadata = user.publicMetadata as Record<string, unknown>;
  await recordAudit({
    action: "user_update_requested",
    entityType: "user",
    entityId: user.id,
    actorId: actorId(res),
    details: `Requested user changes: ${JSON.stringify(body.data)}.`,
  });
  user = await clerkClient.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...metadata,
      ...(body.data.role ? { role: body.data.role, isAdmin: body.data.role === "admin" } : {}),
      ...(body.data.status ? { status: body.data.status } : {}),
    },
  });
  await recordAudit({
    action: body.data.status === "suspended" ? "user_suspended" : "user_updated",
    entityType: "user",
    entityId: user.id,
    actorId: actorId(res),
    details: `Applied user changes: ${JSON.stringify(body.data)}.`,
  });
  res.json(UpdateAdminUserResponse.parse(adminUser(user)));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }
  let user;
  try {
    user = await clerkClient.users.getUser(params.data.id);
  } catch {
    res.status(404).json({ error: "User not found." });
    return;
  }
  await recordAudit({
    action: "user_delete_requested",
    entityType: "user",
    entityId: user.id,
    actorId: actorId(res),
    details: `Deleted @${adminUser(user).username}.`,
  });
  await clerkClient.users.deleteUser(user.id);
  await recordAudit({
    action: "user_deleted",
    entityType: "user",
    entityId: user.id,
    actorId: actorId(res),
    details: `Deleted @${adminUser(user).username}.`,
  });
  res.sendStatus(204);
});

router.get("/content", (req, res): void => {
  const parsed = GetAdminContentQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid content filters." });
    return;
  }
  const query = parsed.data.q?.trim().toLowerCase();
  const filtered = blasts
    .map((blast) => adminContent(blast))
    .filter((blast) => !query || blast.content.toLowerCase().includes(query) || blast.author.username.toLowerCase().includes(query))
    .filter((blast) => !parsed.data.status || parsed.data.status === "all" || blast.status === parsed.data.status);
  res.json(GetAdminContentResponse.parse({ items: filtered, total: filtered.length }));
});

router.patch("/content/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminContentParams.safeParse(req.params);
  const body = UpdateAdminContentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid content update." });
    return;
  }
  const blast = blasts.find((item) => item.id === params.data.id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found." });
    return;
  }
  await setContentStatusWithAudit(blast.id, body.data.status, {
    action: `content_${body.data.status}`,
    entityType: "blast",
    entityId: blast.id,
    actorId: actorId(res),
    details: `Set Blast status to ${body.data.status}.`,
  });
  res.json(UpdateAdminContentResponse.parse(adminContent(blast)));
});

router.delete("/content/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid Blast id." });
    return;
  }
  const blast = blasts.find((item) => item.id === params.data.id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found." });
    return;
  }
  await setContentStatusWithAudit(blast.id, "removed", {
    action: "content_deleted",
    entityType: "blast",
    entityId: blast.id,
    actorId: actorId(res),
    details: "Deleted Blast from the live feed.",
  });
  res.sendStatus(204);
});

router.get("/reports", async (req, res): Promise<void> => {
  const parsed = GetAdminReportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid report filters." });
    return;
  }
  const reports = await Promise.all((await getAdminReports())
    .filter((report) => !parsed.data.status || parsed.data.status === "all" || report.status === parsed.data.status)
    .map(adminReport));
  res.json(GetAdminReportsResponse.parse({ reports, total: reports.length }));
});

router.patch("/reports/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminReportParams.safeParse(req.params);
  const body = UpdateAdminReportBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid moderation action." });
    return;
  }
  const report = await updateAdminReportWithAudit(params.data.id, body.data, {
    action: `report_${body.data.status}`,
    entityType: "report",
    entityId: params.data.id,
    actorId: actorId(res),
    details: body.data.note || `Set report status to ${body.data.status}.`,
  });
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  res.json(UpdateAdminReportResponse.parse(await adminReport(report)));
});

router.get("/moderation", async (_req, res): Promise<void> => {
  const items = await Promise.all((await getAdminReports())
    .filter((report) => report.status === "open" || report.status === "in_review")
    .map(adminReport));
  res.json(GetAdminModerationResponse.parse({ items, openCount: items.length }));
});

router.post("/moderation", async (req, res): Promise<void> => {
  const body = CreateAdminModerationActionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid moderation action." });
    return;
  }
  const report = (await getAdminReports()).find((item) => item.id === body.data.reportId);
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  let contentUpdate: { id: string; status: "removed" } | undefined;
  if (body.data.action === "remove" && report.targetType === "blast") {
    if (!blasts.some((blast) => blast.id === report.targetId)) {
      res.status(404).json({ error: "Reported Blast not found." });
      return;
    }
    contentUpdate = { id: report.targetId, status: "removed" };
    report.status = "resolved";
  } else if (body.data.action === "suspend" && report.targetType === "user") {
    let user;
    try {
      user = await clerkClient.users.getUser(report.targetId);
    } catch {
      res.status(404).json({ error: "Reported user not found." });
      return;
    }
    await recordAudit({
      action: "user_suspension_requested",
      entityType: "user",
      entityId: user.id,
      actorId: actorId(res),
      details: body.data.note || "Requested suspension from a moderation report.",
    });
    await clerkClient.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...(user.publicMetadata as Record<string, unknown>),
        status: "suspended",
      },
    });
    report.status = "resolved";
  } else if (body.data.action === "remove" || body.data.action === "suspend") {
    res.status(400).json({ error: `Action "${body.data.action}" is not valid for ${report.targetType} reports.` });
    return;
  } else if (body.data.action === "dismiss") {
    report.status = "dismissed";
  } else {
    report.status = "resolved";
  }
  report.note = body.data.note ?? "";
  await moderateAdminReportWithAudit({
    reportId: report.id,
    status: report.status,
    note: report.note,
    content: contentUpdate,
  }, {
    action: `moderation_${body.data.action}`,
    entityType: report.targetType,
    entityId: report.targetId,
    actorId: actorId(res),
    details: body.data.note || `Moderation action: ${body.data.action}.`,
  });
  res.json(CreateAdminModerationActionResponse.parse({
    success: true,
    message: `Moderation action "${body.data.action}" completed.`,
  }));
});

router.get("/analytics", async (_req, res): Promise<void> => {
  const reports = await getAdminReports();
  const openReports = reports.filter((report) => report.status === "open" || report.status === "in_review").length;
  const resolvedReports = reports.filter((report) => report.status === "resolved" || report.status === "dismissed").length;
  const totalReports = reports.length;
  const { data: clerkUsers } = await clerkClient.users.getUserList({ limit: 100 });
  res.json(GetAdminAnalyticsResponse.parse({
    activeUsers: clerkUsers.filter((user) => (user.publicMetadata as Record<string, unknown>).status !== "suspended").length,
    totalBlasts: blasts.length,
    openReports,
    moderationRate: totalReports === 0 ? 100 : Math.round((resolvedReports / totalReports) * 100),
    chart: [
      { label: "Mon", users: 148, blasts: 620, reports: 9 },
      { label: "Tue", users: 173, blasts: 714, reports: 11 },
      { label: "Wed", users: 201, blasts: 802, reports: 8 },
      { label: "Thu", users: 236, blasts: 944, reports: 14 },
      { label: "Fri", users: 284, blasts: 1120, reports: 17 },
      { label: "Sat", users: 319, blasts: 1284, reports: totalReports },
    ],
  }));
});

router.get("/system", (_req, res): void => {
  res.json(GetAdminSystemResponse.parse({
    status: "operational",
    version: "0.1.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks: [
      { name: "API", status: "operational", detail: "Express request handling is available." },
      { name: "Authentication", status: "operational", detail: "Clerk authorization middleware is active." },
      { name: "Moderation state", status: "operational", detail: `${adminReports.length} reports loaded.` },
    ],
  }));
});

router.get("/audit-log", (_req, res): void => {
  res.json(GetAdminAuditLogResponse.parse({ events: auditRecords, total: auditRecords.length }));
});

router.get("/settings", (_req, res): void => {
  res.json(GetAdminSettingsResponse.parse(adminSettings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const body = UpdateAdminSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid settings." });
    return;
  }
  const settings = await updateAdminSettingsWithAudit(body.data, actorId(res), {
    action: "settings_updated",
    entityType: "settings",
    entityId: "platform",
    actorId: actorId(res),
    details: `Updated platform moderation settings: ${JSON.stringify(body.data)}.`,
  });
  res.json(UpdateAdminSettingsResponse.parse(settings));
});

router.get("/announcements", (_req, res): void => {
  res.json(GetAdminAnnouncementsResponse.parse(adminAnnouncements));
});

router.post("/announcements", async (req, res): Promise<void> => {
  const body = CreateAdminAnnouncementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid announcement." });
    return;
  }
  const announcement = await createAdminAnnouncementWithAudit(body.data, actorId(res), {
    action: "announcement_created",
    entityType: "announcement",
    entityId: "",
    actorId: actorId(res),
    details: `Created "${body.data.title}".`,
  });
  res.status(201).json(CreateAdminAnnouncementResponse.parse(announcement));
});

router.patch("/announcements/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminAnnouncementParams.safeParse(req.params);
  const body = UpdateAdminAnnouncementBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid announcement update." });
    return;
  }
  const announcement = await updateAdminAnnouncementWithAudit(params.data.id, body.data, actorId(res), {
    action: "announcement_updated",
    entityType: "announcement",
    entityId: params.data.id,
    actorId: actorId(res),
    details: `Updated announcement fields: ${JSON.stringify(body.data)}.`,
  });
  if (!announcement) {
    res.status(404).json({ error: "Announcement not found." });
    return;
  }
  res.json(UpdateAdminAnnouncementResponse.parse(announcement));
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid announcement id." });
    return;
  }
  const existing = adminAnnouncements.find((item) => item.id === params.data.id);
  const deleted = await deleteAdminAnnouncementWithAudit(params.data.id, {
    action: "announcement_deleted",
    entityType: "announcement",
    entityId: params.data.id,
    actorId: actorId(res),
    details: `Deleted "${existing?.title ?? params.data.id}".`,
  });
  if (!deleted) {
    res.status(404).json({ error: "Announcement not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/features", (_req, res): void => {
  res.json(GetAdminFeaturesResponse.parse(adminFeatureFlags));
});

router.patch("/features/:key", async (req, res): Promise<void> => {
  const params = UpdateAdminFeatureParams.safeParse(req.params);
  const body = UpdateAdminFeatureBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid feature update." });
    return;
  }
  const feature = await updateAdminFeatureWithAudit(params.data.key, body.data.enabled, actorId(res), {
    action: body.data.enabled ? "feature_enabled" : "feature_disabled",
    entityType: "feature",
    entityId: params.data.key,
    actorId: actorId(res),
    details: `${params.data.key} ${body.data.enabled ? "enabled" : "disabled"}.`,
  });
  if (!feature) {
    res.status(404).json({ error: "Feature not found." });
    return;
  }
  res.json(UpdateAdminFeatureResponse.parse(feature));
});

export default router;
