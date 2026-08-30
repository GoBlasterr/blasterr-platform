import { randomUUID } from "node:crypto";

export type AdminReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type AdminContentStatus = "published" | "hidden" | "removed";

export type AdminReportRecord = {
  id: string;
  targetType: "blast" | "comment" | "user";
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

const now = () => new Date().toISOString();

export const adminReports: AdminReportRecord[] = [
  {
    id: "report-1001",
    targetType: "blast",
    targetId: "blast-2",
    reason: "harassment",
    description: "The post targets another community member with repeated insults.",
    status: "open",
    createdAt: "2026-08-30T08:12:00.000Z",
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
    createdAt: "2026-08-29T18:44:00.000Z",
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
    createdAt: "2026-08-28T11:06:00.000Z",
    reporterId: "user-kinamin",
    note: "Verified profile ownership.",
  },
];

export const auditRecords: AuditRecord[] = [
  {
    id: "audit-2001",
    action: "content_hidden",
    entityType: "blast",
    entityId: "blast-4",
    actorId: "user-kinamin",
    details: "Hidden while reviewing a community report.",
    createdAt: "2026-08-30T07:52:00.000Z",
  },
  {
    id: "audit-2002",
    action: "report_resolved",
    entityType: "report",
    entityId: "report-1003",
    actorId: "user-kinamin",
    details: "Verified profile ownership.",
    createdAt: "2026-08-29T16:27:00.000Z",
  },
];

export const adminContentStatuses = new Map<string, AdminContentStatus>([
  ["blast-4", "hidden"],
]);

export const adminSettings = {
  maintenanceMode: false,
  contentReviewMode: false,
  supportEmail: "support@blasterr.social",
};

export const adminAnnouncements = [
  {
    id: "announcement-1",
    title: "Community standards refresh",
    message: "Please review the updated moderation guidance before your next shift.",
    audience: "all",
    status: "published",
    createdAt: "2026-08-28T14:00:00.000Z",
    updatedAt: "2026-08-28T14:00:00.000Z",
  },
  {
    id: "announcement-2",
    title: "Scheduled maintenance",
    message: "The media pipeline will be read-only Saturday at 02:00 UTC.",
    audience: "admins",
    status: "draft",
    createdAt: "2026-08-29T10:30:00.000Z",
    updatedAt: "2026-08-29T10:30:00.000Z",
  },
];

export const adminFeatureFlags = [
  {
    key: "blast_back",
    label: "Blast Back",
    description: "Allow users to respond to a Blast with a linked Blast.",
    enabled: true,
    updatedAt: "2026-08-27T09:15:00.000Z",
  },
  {
    key: "clip_creation",
    label: "Clip creation",
    description: "Allow eligible users to create short-form video clips.",
    enabled: true,
    updatedAt: "2026-08-26T13:42:00.000Z",
  },
  {
    key: "new_target_requests",
    label: "New Target requests",
    description: "Allow the community to suggest new Targets.",
    enabled: true,
    updatedAt: "2026-08-24T16:08:00.000Z",
  },
];

export function createAdminReport(input: Omit<AdminReportRecord, "id" | "status" | "createdAt" | "note">): AdminReportRecord {
  const report: AdminReportRecord = {
    ...input,
    id: randomUUID(),
    status: "open",
    createdAt: now(),
    note: "",
  };
  adminReports.unshift(report);
  return report;
}

export function recordAudit(input: Omit<AuditRecord, "id" | "createdAt">): AuditRecord {
  const record = { ...input, id: randomUUID(), createdAt: now() };
  auditRecords.unshift(record);
  return record;
}