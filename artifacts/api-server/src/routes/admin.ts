import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  CreateAdminAnnouncementBody,
  CreateAdminAnnouncementResponse,
  CreateAdminBlockedWordBody,
  CreateAdminBlockedWordResponse,
  CreateAdminModerationActionBody,
  CreateAdminModerationActionResponse,
  DeleteAdminBlockedWordParams,
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
  ListAdminAppealsQueryParams,
  ListAdminAppealsResponse,
  ListAdminBlockedWordsResponse,
  ListAdminNotificationsQueryParams,
  ListAdminNotificationsResponse,
  MarkAdminNotificationReadParams,
  MarkAdminNotificationReadResponse,
  MarkAllAdminNotificationsReadResponse,
  ReviewAdminAppealBody,
  ReviewAdminAppealParams,
  ReviewAdminAppealResponse,
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
  UpdateAdminBlockedWordBody,
  UpdateAdminBlockedWordParams,
  UpdateAdminBlockedWordResponse,
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
import * as social from "../lib/social-repository";
import {
  adminReportsTable,
  adminAppealsTable,
  adminBlockedWordsTable,
  adminNotificationsTable,
  blastsTable,
  db,
  usersTable,
  validateDatabaseConnection,
} from "@workspace/db";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { checkR2Connection } from "../lib/r2";

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
  const developmentBypass = process.env.NODE_ENV === "development" && process.env.DEV_ADMIN_BYPASS === "true";
  if (developmentBypass) {
    res.locals.adminActorId = getAuth(req).userId ?? "development-admin";
    next();
    return;
  }
  const { userId } = getAuth(req);
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

const appealPayload = (row: typeof adminAppealsTable.$inferSelect) => ({
  ...row,
  reviewerClerkId: row.reviewerClerkId ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const blockedWordPayload = (row: typeof adminBlockedWordsTable.$inferSelect) => ({
  id: row.id,
  term: row.term,
  action: row.action,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const adminNotificationPayload = (row: typeof adminNotificationsTable.$inferSelect) => ({
  id: row.id,
  category: row.category,
  title: row.title,
  message: row.message,
  entityType: row.entityType ?? null,
  entityId: row.entityId ?? null,
  read: row.read,
  createdAt: row.createdAt.toISOString(),
});

function page<T>(items: T[], pageNumber: number, limit: number) {
  return {
    items: items.slice((pageNumber - 1) * limit, pageNumber * limit),
    page: pageNumber,
    limit,
    total: items.length,
    hasMore: pageNumber * limit < items.length,
  };
}

function normalizedBlockedTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

async function adminUser(user: Awaited<ReturnType<typeof clerkClient.users.getUser>>) {
  const metadata = user.publicMetadata as Record<string, unknown>;
  const localUser = await social.userByAuth(user.id);
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
    blastCount: localUser
      ? (await social.blasts()).filter((blast) => blast.author.id === localUser.id).length
      : 0,
    joinedAt: new Date(user.createdAt).toISOString(),
    isFollowing: false,
    role,
    status: metadata.status === "suspended" ? "suspended" as const : "active" as const,
  };
}

function adminContent(
  blast: Awaited<ReturnType<typeof social.blasts>>[number],
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
  const localUser = await social.userById(reporterId);
  if (localUser) return social.profile(localUser);
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
  const filtered = (await Promise.all(data
    .map(adminUser)))
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
  res.json(UpdateAdminUserResponse.parse(await adminUser(user)));
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
    details: `Deleted @${(await adminUser(user)).username}.`,
  });
  await clerkClient.users.deleteUser(user.id);
  await recordAudit({
    action: "user_deleted",
    entityType: "user",
    entityId: user.id,
    actorId: actorId(res),
    details: `Deleted @${(await adminUser(user)).username}.`,
  });
  res.sendStatus(204);
});

router.get("/content", async (req, res): Promise<void> => {
  const parsed = GetAdminContentQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid content filters." });
    return;
  }
  const query = parsed.data.q?.trim().toLowerCase();
  const filtered = (await social.blasts())
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
  const blast = await social.blastById(params.data.id);
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
  const blast = await social.blastById(params.data.id);
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
    if (!await social.blastById(report.targetId)) {
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
  const [summaryResult, chartResult] = await Promise.all([
    db.execute(sql`
      select
        (select count(*) from ${usersTable} where ${usersTable.status} = 'active') as active_users,
        (select count(*) from ${blastsTable} where ${blastsTable.status} <> 'deleted') as total_blasts,
        (select count(*) from ${adminReportsTable} where ${adminReportsTable.status} in ('open', 'in_review')) as open_reports,
        (select count(*) from ${adminReportsTable}) as total_reports,
        (select count(*) from ${adminReportsTable} where ${adminReportsTable.status} in ('resolved', 'dismissed')) as resolved_reports
    `),
    db.execute(sql`
      with days as (
        select generate_series(
          date_trunc('day', now()) - interval '6 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      )
      select
        to_char(day, 'Dy') as label,
        (select count(*) from ${usersTable}
          where ${usersTable.createdAt} < day + interval '1 day'
            and ${usersTable.status} <> 'deleted') as users,
        (select count(*) from ${blastsTable}
          where ${blastsTable.createdAt} < day + interval '1 day'
            and ${blastsTable.status} <> 'deleted') as blasts,
        (select count(*) from ${adminReportsTable}
          where ${adminReportsTable.createdAt} < day + interval '1 day') as reports
      from days
      order by day
    `),
  ]);
  const summary = summaryResult.rows[0] as Record<string, unknown> | undefined;
  const activeUsers = Number(summary?.active_users ?? 0);
  const totalBlasts = Number(summary?.total_blasts ?? 0);
  const openReports = Number(summary?.open_reports ?? 0);
  const totalReports = Number(summary?.total_reports ?? 0);
  const resolvedReports = Number(summary?.resolved_reports ?? 0);

  res.json(GetAdminAnalyticsResponse.parse({
    activeUsers,
    totalBlasts,
    openReports,
    moderationRate: totalReports === 0 ? 100 : Math.round((resolvedReports / totalReports) * 100),
    chart: chartResult.rows.map((row) => ({
      label: String(row.label),
      users: Number(row.users),
      blasts: Number(row.blasts),
      reports: Number(row.reports),
    })),
  }));
});

router.get("/system", async (_req, res): Promise<void> => {
  const [database, storage] = await Promise.all([
    validateDatabaseConnection()
      .then(() => ({ status: "operational" as const, detail: "Supabase PostgreSQL is reachable through the configured pooler." }))
      .catch(() => ({ status: "degraded" as const, detail: "Supabase PostgreSQL could not be reached." })),
    checkR2Connection(),
  ]);
  const operational = database.status === "operational" && storage.status === "operational";
  res.json(GetAdminSystemResponse.parse({
    status: operational ? "operational" : "degraded",
    version: "0.1.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks: [
      { name: "API", status: "operational", detail: "Express request handling is available." },
      { name: "Authentication", status: "operational", detail: "Clerk authorization middleware is active." },
      { name: "Database", status: database.status, detail: database.detail },
      { name: "Media storage", status: storage.status === "operational" ? "operational" : "degraded", detail: storage.detail },
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

router.get("/appeals", async (req, res): Promise<void> => {
  const parsed = ListAdminAppealsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid appeal filters." });
    return;
  }
  const rows = await db.select().from(adminAppealsTable).orderBy(desc(adminAppealsTable.createdAt));
  const filtered = rows.filter((row) => parsed.data.status === "all" || row.status === parsed.data.status);
  res.json(ListAdminAppealsResponse.parse(page(filtered.map(appealPayload), parsed.data.page, parsed.data.limit)));
});

router.patch("/appeals/:id", async (req, res): Promise<void> => {
  const params = ReviewAdminAppealParams.safeParse(req.params);
  const body = ReviewAdminAppealBody.safeParse(req.body);
  if (!params.success || !body.success || (["approved", "rejected"].includes(body.data.status) && !body.data.note?.trim())) {
    res.status(400).json({ error: "A valid appeal decision and note are required." });
    return;
  }
  const [row] = await db.update(adminAppealsTable).set({
    status: body.data.status,
    reviewerClerkId: actorId(res),
    reviewerNote: body.data.note?.trim() ?? "",
    updatedAt: new Date(),
  }).where(eq(adminAppealsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Appeal not found." });
    return;
  }
  await recordAudit({
    action: `appeal_${body.data.status}`,
    entityType: "appeal",
    entityId: row.id,
    actorId: actorId(res),
    details: body.data.note?.trim() || `Appeal moved to ${body.data.status}.`,
  });
  res.json(ReviewAdminAppealResponse.parse(appealPayload(row)));
});

router.get("/blocked-words", async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminBlockedWordsTable).orderBy(desc(adminBlockedWordsTable.createdAt));
  res.json(ListAdminBlockedWordsResponse.parse(rows.map(blockedWordPayload)));
});

router.post("/blocked-words", async (req, res): Promise<void> => {
  const body = CreateAdminBlockedWordBody.safeParse(req.body);
  if (!body.success || !normalizedBlockedTerm(body.data.term)) {
    res.status(400).json({ error: "A valid moderation term is required." });
    return;
  }
  try {
    const [row] = await db.insert(adminBlockedWordsTable).values({
      term: body.data.term.trim(),
      normalizedTerm: normalizedBlockedTerm(body.data.term),
      action: body.data.action,
      createdBy: actorId(res),
    }).returning();
    await recordAudit({
      action: "blocked_word_created",
      entityType: "blocked_word",
      entityId: row.id,
      actorId: actorId(res),
      details: `Added a ${row.action} moderation term.`,
    });
    res.status(201).json(CreateAdminBlockedWordResponse.parse(blockedWordPayload(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That moderation term already exists." });
      return;
    }
    throw error;
  }
});

router.patch("/blocked-words/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminBlockedWordParams.safeParse(req.params);
  const body = UpdateAdminBlockedWordBody.safeParse(req.body);
  if (!params.success || !body.success || !Object.keys(body.data).length || (body.data.term !== undefined && !normalizedBlockedTerm(body.data.term))) {
    res.status(400).json({ error: "A valid moderation term update is required." });
    return;
  }
  try {
    const [row] = await db.update(adminBlockedWordsTable).set({
      ...body.data,
      term: body.data.term?.trim(),
      normalizedTerm: body.data.term === undefined ? undefined : normalizedBlockedTerm(body.data.term),
      updatedAt: new Date(),
    }).where(eq(adminBlockedWordsTable.id, params.data.id)).returning();
    if (!row) {
      res.status(404).json({ error: "Moderation term not found." });
      return;
    }
    await recordAudit({
      action: "blocked_word_updated",
      entityType: "blocked_word",
      entityId: row.id,
      actorId: actorId(res),
      details: `Updated moderation term controls (${row.action}, ${row.status}).`,
    });
    res.json(UpdateAdminBlockedWordResponse.parse(blockedWordPayload(row)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That moderation term already exists." });
      return;
    }
    throw error;
  }
});

router.delete("/blocked-words/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminBlockedWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid moderation term." });
    return;
  }
  const [row] = await db.delete(adminBlockedWordsTable).where(eq(adminBlockedWordsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Moderation term not found." });
    return;
  }
  await recordAudit({
    action: "blocked_word_deleted",
    entityType: "blocked_word",
    entityId: row.id,
    actorId: actorId(res),
    details: `Deleted a ${row.action} moderation term.`,
  });
  res.sendStatus(204);
});

router.get("/notifications", async (req, res): Promise<void> => {
  const parsed = ListAdminNotificationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid notification filters." });
    return;
  }
  const visible = or(isNull(adminNotificationsTable.adminClerkId), eq(adminNotificationsTable.adminClerkId, actorId(res)));
  const rows = await db.select().from(adminNotificationsTable)
    .where(parsed.data.unreadOnly ? and(visible, eq(adminNotificationsTable.read, false)) : visible)
    .orderBy(desc(adminNotificationsTable.createdAt))
    .limit(parsed.data.limit);
  const unread = await db.select({ total: sql<number>`count(*)::int` }).from(adminNotificationsTable)
    .where(and(visible, eq(adminNotificationsTable.read, false)));
  res.json(ListAdminNotificationsResponse.parse({
    items: rows.map(adminNotificationPayload),
    unreadCount: unread[0]?.total ?? 0,
  }));
});

router.patch("/notifications/read-all", async (_req, res): Promise<void> => {
  const visible = or(isNull(adminNotificationsTable.adminClerkId), eq(adminNotificationsTable.adminClerkId, actorId(res)));
  await db.update(adminNotificationsTable).set({ read: true }).where(visible);
  res.json(MarkAllAdminNotificationsReadResponse.parse({ unreadCount: 0 }));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkAdminNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification." });
    return;
  }
  const visible = or(isNull(adminNotificationsTable.adminClerkId), eq(adminNotificationsTable.adminClerkId, actorId(res)));
  const [row] = await db.update(adminNotificationsTable).set({ read: true })
    .where(and(eq(adminNotificationsTable.id, params.data.id), visible))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Notification not found." });
    return;
  }
  res.json(MarkAdminNotificationReadResponse.parse(adminNotificationPayload(row)));
});

export default router;
