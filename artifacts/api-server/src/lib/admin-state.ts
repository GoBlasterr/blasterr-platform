import { randomUUID } from "node:crypto";
import {
  adminAnnouncementsTable,
  adminAuditEventsTable,
  adminContentStatusesTable,
  adminFeatureFlagsTable,
  adminReportsTable,
  adminSettingsTable,
  db,
  type AdminAnnouncementRow,
  type AdminAuditEventRow,
  type AdminReportRow,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { seedDevelopmentAdvertising, shouldSeedDevelopmentState } from "./admin-seeding";

export { shouldSeedDevelopmentState } from "./admin-seeding";

export type AdminReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type AdminContentStatus = "published" | "hidden" | "removed";
export type AdminReportTargetType = "blast" | "comment" | "user";

export type AdminReportRecord = {
  id: string;
  targetType: AdminReportTargetType;
  targetId: string;
  reason: string;
  description: string;
  status: AdminReportStatus;
  createdAt: string;
  reporterId: string;
  note: string;
};

export type AuditRecord = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  details: string;
  createdAt: string;
};

export type AdminAnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "admins" | "moderators";
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
};

export type AdminFeatureRecord = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
};

const developmentReports = [
  {
    id: "report-1001",
    targetType: "blast",
    targetId: "blast-2",
    reason: "harassment",
    description: "The post targets another community member with repeated insults.",
    status: "open",
    createdAt: new Date("2026-08-30T08:12:00.000Z"),
    reporterId: "user-nova",
    note: "",
  },
  {
    id: "report-1002",
    targetType: "blast",
    targetId: "blast-3",
    reason: "spam",
    description: "Repeated promotional copy was posted across several Targets.",
    status: "in_review",
    createdAt: new Date("2026-08-29T18:44:00.000Z"),
    reporterId: "user-marcus",
    note: "Checking duplicate activity.",
  },
  {
    id: "report-1003",
    targetType: "user",
    targetId: "user-marcus",
    reason: "impersonation",
    description: "Reporter says this profile is using a public figure's identity.",
    status: "resolved",
    createdAt: new Date("2026-08-28T11:06:00.000Z"),
    reporterId: "user-kinamin",
    note: "Verified profile ownership.",
  },
] as const;

const developmentAuditEvents = [
  {
    id: "audit-2001",
    action: "content_hidden",
    entityType: "blast",
    entityId: "blast-4",
    actorId: "user-kinamin",
    details: "Hidden while reviewing a community report.",
    createdAt: new Date("2026-08-30T07:52:00.000Z"),
  },
  {
    id: "audit-2002",
    action: "report_resolved",
    entityType: "report",
    entityId: "report-1003",
    actorId: "user-kinamin",
    details: "Verified profile ownership.",
    createdAt: new Date("2026-08-29T16:27:00.000Z"),
  },
] as const;

const developmentContentStatuses = [{ contentId: "blast-4", status: "hidden" }] as const;

const defaultFeatures = [
  {
    key: "blast_back",
    label: "Blast Back",
    description: "Allow users to respond to a Blast with a linked Blast.",
    enabled: true,
  },
  {
    key: "clip_creation",
    label: "Clip creation",
    description: "Allow eligible users to create short-form video clips.",
    enabled: true,
  },
  {
    key: "new_target_requests",
    label: "New Target requests",
    description: "Allow the community to suggest new Targets.",
    enabled: true,
  },
] as const;

const developmentAnnouncements = [
  {
    id: "announcement-1",
    title: "Community standards refresh",
    message: "Please review the updated moderation guidance before your next shift.",
    audience: "all",
    status: "published",
    createdAt: new Date("2026-08-28T14:00:00.000Z"),
    updatedAt: new Date("2026-08-28T14:00:00.000Z"),
  },
  {
    id: "announcement-2",
    title: "Scheduled maintenance",
    message: "The media pipeline will be read-only Saturday at 02:00 UTC.",
    audience: "admins",
    status: "draft",
    createdAt: new Date("2026-08-29T10:30:00.000Z"),
    updatedAt: new Date("2026-08-29T10:30:00.000Z"),
  },
] as const;

export const adminReports: AdminReportRecord[] = [];
export const auditRecords: AuditRecord[] = [];
export const adminContentStatuses = new Map<string, AdminContentStatus>();
export const adminSettings = {
  maintenanceMode: false,
  contentReviewMode: false,
  supportEmail: "support@blasterr.social",
};
export const adminAnnouncements: AdminAnnouncementRecord[] = [];
export const adminFeatureFlags: AdminFeatureRecord[] = [];

let initialization: Promise<void> | null = null;
let refreshInFlight: Promise<void> | null = null;
let lastRefreshAt = 0;
const cacheTtlMs = 5_000;

function reportPayload(row: AdminReportRow): AdminReportRecord {
  return {
    id: row.id,
    targetType: row.targetType as AdminReportTargetType,
    targetId: row.targetId,
    reason: row.reason,
    description: row.description,
    status: row.status as AdminReportStatus,
    createdAt: row.createdAt.toISOString(),
    reporterId: row.reporterId,
    note: row.note,
  };
}

function auditPayload(row: AdminAuditEventRow): AuditRecord {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function announcementPayload(row: AdminAnnouncementRow): AdminAnnouncementRecord {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: row.audience as AdminAnnouncementRecord["audience"],
    status: row.status as AdminAnnouncementRecord["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function refreshCache(): Promise<void> {
  const [settings, features, reports, audits, statuses, announcements] = await Promise.all([
    db.select().from(adminSettingsTable).where(eq(adminSettingsTable.id, "singleton")),
    db.select().from(adminFeatureFlagsTable),
    db.select().from(adminReportsTable).orderBy(desc(adminReportsTable.createdAt)),
    db.select().from(adminAuditEventsTable).orderBy(desc(adminAuditEventsTable.createdAt)),
    db.select().from(adminContentStatusesTable),
    db.select().from(adminAnnouncementsTable).orderBy(desc(adminAnnouncementsTable.updatedAt)),
  ]);

  if (settings[0]) {
    Object.assign(adminSettings, {
      maintenanceMode: settings[0].maintenanceMode,
      contentReviewMode: settings[0].contentReviewMode,
      supportEmail: settings[0].supportEmail,
    });
  }
  adminFeatureFlags.splice(0, adminFeatureFlags.length, ...features.map((feature) => ({
    key: feature.key,
    label: feature.label,
    description: feature.description,
    enabled: feature.enabled,
    updatedAt: feature.updatedAt.toISOString(),
  })));
  adminReports.splice(0, adminReports.length, ...reports.map(reportPayload));
  auditRecords.splice(0, auditRecords.length, ...audits.map(auditPayload));
  adminContentStatuses.clear();
  for (const status of statuses) adminContentStatuses.set(status.contentId, status.status as AdminContentStatus);
  adminAnnouncements.splice(0, adminAnnouncements.length, ...announcements.map(announcementPayload));
  lastRefreshAt = Date.now();
}

async function seedDevelopmentState(): Promise<void> {
  if (!shouldSeedDevelopmentState()) return;

  await seedDevelopmentAdvertising();
  await db.insert(adminReportsTable).values([...developmentReports]).onConflictDoNothing();
  await db.insert(adminAuditEventsTable).values([...developmentAuditEvents]).onConflictDoNothing();
  await db.insert(adminContentStatusesTable).values([...developmentContentStatuses]).onConflictDoNothing();
  await db.insert(adminAnnouncementsTable).values([...developmentAnnouncements]).onConflictDoNothing();
}

async function seedDefaultConfiguration(): Promise<void> {
  await db.insert(adminSettingsTable).values({ id: "singleton" }).onConflictDoNothing();
  await db.insert(adminFeatureFlagsTable).values([...defaultFeatures]).onConflictDoNothing();
}

export async function ensureAdminState(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await seedDefaultConfiguration();
      await seedDevelopmentState();
      await refreshCache();
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
  if (Date.now() - lastRefreshAt > cacheTtlMs) {
    if (!refreshInFlight) {
      refreshInFlight = refreshCache().finally(() => {
        refreshInFlight = null;
      });
    }
    await refreshInFlight;
  }
}

export async function getAdminReports(): Promise<AdminReportRecord[]> {
  await ensureAdminState();
  return [...adminReports];
}

export async function createAdminReport(
  input: Omit<AdminReportRecord, "id" | "status" | "createdAt" | "note">,
): Promise<AdminReportRecord> {
  await ensureAdminState();
  const [report] = await db.insert(adminReportsTable).values(input).returning();
  if (!report) throw new Error("Unable to create report");
  const payload = reportPayload(report);
  adminReports.unshift(payload);
  return payload;
}

type AuditInput = Omit<AuditRecord, "id" | "createdAt">;

async function insertAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: AuditInput,
): Promise<AuditRecord> {
  const [record] = await tx.insert(adminAuditEventsTable).values(input).returning();
  if (!record) throw new Error("Unable to record audit event");
  return auditPayload(record);
}

export async function createAdminReportWithAudit(
  input: Omit<AdminReportRecord, "id" | "status" | "createdAt" | "note">,
  audit: AuditInput,
): Promise<AdminReportRecord> {
  await ensureAdminState();
  const [report] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(adminReportsTable).values(input).returning();
    if (!created) throw new Error("Unable to create report");
    await insertAudit(tx, audit);
    return [created] as const;
  });
  const payload = reportPayload(report);
  adminReports.unshift(payload);
  return payload;
}

export async function updateAdminReport(
  id: string,
  update: { status: AdminReportStatus; note?: string },
): Promise<AdminReportRecord | null> {
  await ensureAdminState();
  const [report] = await db.update(adminReportsTable)
    .set({ status: update.status, ...(update.note !== undefined ? { note: update.note } : {}) })
    .where(eq(adminReportsTable.id, id))
    .returning();
  if (!report) return null;
  const payload = reportPayload(report);
  const index = adminReports.findIndex((item) => item.id === id);
  if (index >= 0) adminReports[index] = payload;
  return payload;
}

export async function updateAdminReportWithAudit(
  id: string,
  update: { status: AdminReportStatus; note?: string },
  audit: AuditInput,
): Promise<AdminReportRecord | null> {
  await ensureAdminState();
  const [report] = await db.transaction(async (tx) => {
    const [updated] = await tx.update(adminReportsTable)
      .set({ status: update.status, ...(update.note !== undefined ? { note: update.note } : {}) })
      .where(eq(adminReportsTable.id, id))
      .returning();
    if (!updated) return [];
    await insertAudit(tx, audit);
    return [updated] as const;
  });
  if (!report) return null;
  const payload = reportPayload(report);
  const index = adminReports.findIndex((item) => item.id === id);
  if (index >= 0) adminReports[index] = payload;
  return payload;
}

export async function moderateAdminReportWithAudit(
  input: {
    reportId: string;
    status: AdminReportStatus;
    note: string;
    content?: { id: string; status: AdminContentStatus };
  },
  audit: AuditInput,
): Promise<AdminReportRecord | null> {
  await ensureAdminState();
  const [report] = await db.transaction(async (tx) => {
    if (input.content) {
      await tx.insert(adminContentStatusesTable)
        .values({ contentId: input.content.id, status: input.content.status })
        .onConflictDoUpdate({
          target: adminContentStatusesTable.contentId,
          set: { status: input.content.status, updatedAt: new Date() },
        });
    }
    const [updated] = await tx.update(adminReportsTable)
      .set({ status: input.status, note: input.note })
      .where(eq(adminReportsTable.id, input.reportId))
      .returning();
    if (!updated) return [];
    await insertAudit(tx, audit);
    return [updated] as const;
  });
  if (!report) return null;
  if (input.content) adminContentStatuses.set(input.content.id, input.content.status);
  const payload = reportPayload(report);
  const index = adminReports.findIndex((item) => item.id === input.reportId);
  if (index >= 0) adminReports[index] = payload;
  return payload;
}

export async function recordAudit(
  input: Omit<AuditRecord, "id" | "createdAt">,
): Promise<AuditRecord> {
  await ensureAdminState();
  const [record] = await db.insert(adminAuditEventsTable).values(input).returning();
  if (!record) throw new Error("Unable to record audit event");
  const payload = auditPayload(record);
  auditRecords.unshift(payload);
  return payload;
}

export async function setContentStatusWithAudit(
  id: string,
  status: AdminContentStatus,
  audit: AuditInput,
): Promise<void> {
  await ensureAdminState();
  await db.transaction(async (tx) => {
    await tx.insert(adminContentStatusesTable)
      .values({ contentId: id, status })
      .onConflictDoUpdate({
        target: adminContentStatusesTable.contentId,
        set: { status, updatedAt: new Date() },
      });
    await insertAudit(tx, audit);
  });
  adminContentStatuses.set(id, status);
}

export async function setContentStatus(id: string, status: AdminContentStatus): Promise<void> {
  await ensureAdminState();
  await db.insert(adminContentStatusesTable)
    .values({ contentId: id, status })
    .onConflictDoUpdate({
      target: adminContentStatusesTable.contentId,
      set: { status, updatedAt: new Date() },
    });
  adminContentStatuses.set(id, status);
}

export async function updateAdminSettings(
  update: Partial<typeof adminSettings>,
  updatedBy: string,
): Promise<typeof adminSettings> {
  await ensureAdminState();
  const [settings] = await db.update(adminSettingsTable)
    .set({ ...update, updatedBy, updatedAt: new Date() })
    .where(eq(adminSettingsTable.id, "singleton"))
    .returning();
  if (!settings) throw new Error("Unable to update admin settings");
  Object.assign(adminSettings, update);
  return { ...adminSettings };
}

export async function updateAdminSettingsWithAudit(
  update: Partial<typeof adminSettings>,
  updatedBy: string,
  audit: AuditInput,
): Promise<typeof adminSettings> {
  await ensureAdminState();
  const settings = await db.transaction(async (tx) => {
    const [updated] = await tx.update(adminSettingsTable)
      .set({ ...update, updatedBy, updatedAt: new Date() })
      .where(eq(adminSettingsTable.id, "singleton"))
      .returning();
    if (!updated) throw new Error("Unable to update admin settings");
    await insertAudit(tx, audit);
    return updated;
  });
  Object.assign(adminSettings, update);
  return {
    maintenanceMode: settings.maintenanceMode,
    contentReviewMode: settings.contentReviewMode,
    supportEmail: settings.supportEmail,
  };
}

export async function createAdminAnnouncement(
  input: Omit<AdminAnnouncementRecord, "id" | "createdAt" | "updatedAt">,
  updatedBy: string,
): Promise<AdminAnnouncementRecord> {
  await ensureAdminState();
  const [announcement] = await db.insert(adminAnnouncementsTable)
    .values({ ...input, updatedBy })
    .returning();
  if (!announcement) throw new Error("Unable to create announcement");
  const payload = announcementPayload(announcement);
  adminAnnouncements.unshift(payload);
  return payload;
}

export async function createAdminAnnouncementWithAudit(
  input: Omit<AdminAnnouncementRecord, "id" | "createdAt" | "updatedAt">,
  updatedBy: string,
  audit: AuditInput,
): Promise<AdminAnnouncementRecord> {
  await ensureAdminState();
  const id = randomUUID();
  const [announcement] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(adminAnnouncementsTable)
      .values({ ...input, id, updatedBy })
      .returning();
    if (!created) throw new Error("Unable to create announcement");
    await insertAudit(tx, { ...audit, entityId: id });
    return [created] as const;
  });
  const payload = announcementPayload(announcement);
  adminAnnouncements.unshift(payload);
  return payload;
}

export async function updateAdminAnnouncement(
  id: string,
  update: Partial<Omit<AdminAnnouncementRecord, "id" | "createdAt" | "updatedAt">>,
  updatedBy: string,
): Promise<AdminAnnouncementRecord | null> {
  await ensureAdminState();
  const [announcement] = await db.update(adminAnnouncementsTable)
    .set({ ...update, updatedBy, updatedAt: new Date() })
    .where(eq(adminAnnouncementsTable.id, id))
    .returning();
  if (!announcement) return null;
  const payload = announcementPayload(announcement);
  const index = adminAnnouncements.findIndex((item) => item.id === id);
  if (index >= 0) adminAnnouncements[index] = payload;
  return payload;
}

export async function updateAdminAnnouncementWithAudit(
  id: string,
  update: Partial<Omit<AdminAnnouncementRecord, "id" | "createdAt" | "updatedAt">>,
  updatedBy: string,
  audit: AuditInput,
): Promise<AdminAnnouncementRecord | null> {
  await ensureAdminState();
  const [announcement] = await db.transaction(async (tx) => {
    const [updated] = await tx.update(adminAnnouncementsTable)
      .set({ ...update, updatedBy, updatedAt: new Date() })
      .where(eq(adminAnnouncementsTable.id, id))
      .returning();
    if (!updated) return [];
    await insertAudit(tx, audit);
    return [updated] as const;
  });
  if (!announcement) return null;
  const payload = announcementPayload(announcement);
  const index = adminAnnouncements.findIndex((item) => item.id === id);
  if (index >= 0) adminAnnouncements[index] = payload;
  return payload;
}

export async function deleteAdminAnnouncement(id: string): Promise<AdminAnnouncementRecord | null> {
  await ensureAdminState();
  const [announcement] = await db.delete(adminAnnouncementsTable)
    .where(eq(adminAnnouncementsTable.id, id))
    .returning();
  if (!announcement) return null;
  const index = adminAnnouncements.findIndex((item) => item.id === id);
  if (index >= 0) adminAnnouncements.splice(index, 1);
  return announcementPayload(announcement);
}

export async function deleteAdminAnnouncementWithAudit(
  id: string,
  audit: AuditInput,
): Promise<AdminAnnouncementRecord | null> {
  await ensureAdminState();
  const [announcement] = await db.transaction(async (tx) => {
    const [deleted] = await tx.delete(adminAnnouncementsTable)
      .where(eq(adminAnnouncementsTable.id, id))
      .returning();
    if (!deleted) return [];
    await insertAudit(tx, audit);
    return [deleted] as const;
  });
  if (!announcement) return null;
  const index = adminAnnouncements.findIndex((item) => item.id === id);
  if (index >= 0) adminAnnouncements.splice(index, 1);
  return announcementPayload(announcement);
}

export async function updateAdminFeature(
  key: string,
  enabled: boolean,
  updatedBy: string,
): Promise<AdminFeatureRecord | null> {
  await ensureAdminState();
  const [feature] = await db.update(adminFeatureFlagsTable)
    .set({ enabled, updatedBy, updatedAt: new Date() })
    .where(eq(adminFeatureFlagsTable.key, key))
    .returning();
  if (!feature) return null;
  const payload = { ...feature, updatedAt: feature.updatedAt.toISOString() };
  const index = adminFeatureFlags.findIndex((item) => item.key === key);
  if (index >= 0) adminFeatureFlags[index] = payload;
  return payload;
}

export async function updateAdminFeatureWithAudit(
  key: string,
  enabled: boolean,
  updatedBy: string,
  audit: AuditInput,
): Promise<AdminFeatureRecord | null> {
  await ensureAdminState();
  const [feature] = await db.transaction(async (tx) => {
    const [updated] = await tx.update(adminFeatureFlagsTable)
      .set({ enabled, updatedBy, updatedAt: new Date() })
      .where(eq(adminFeatureFlagsTable.key, key))
      .returning();
    if (!updated) return [];
    await insertAudit(tx, audit);
    return [updated] as const;
  });
  if (!feature) return null;
  const payload = { ...feature, updatedAt: feature.updatedAt.toISOString() };
  const index = adminFeatureFlags.findIndex((item) => item.key === key);
  if (index >= 0) adminFeatureFlags[index] = payload;
  return payload;
}