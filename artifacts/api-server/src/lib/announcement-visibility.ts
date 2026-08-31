export type AnnouncementViewerRole = "user" | "moderator" | "admin";
export type AnnouncementAuthorizationMetadata = Record<string, unknown>;

export type AnnouncementVisibilityRecord = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "admins" | "moderators";
  status: "draft" | "published";
  updatedAt: string;
};

export type PublicAnnouncement = Pick<
  AnnouncementVisibilityRecord,
  "id" | "title" | "message" | "updatedAt"
>;

export function resolveAnnouncementViewerRole(
  metadata: AnnouncementAuthorizationMetadata,
): AnnouncementViewerRole {
  if (metadata.status === "suspended") return "user";
  if (metadata.role === "admin" || metadata.isAdmin === true) return "admin";
  if (metadata.role === "moderator") return "moderator";
  return "user";
}

export function filterPublishedAnnouncementsForViewer(
  announcements: AnnouncementVisibilityRecord[],
  viewerRole: AnnouncementViewerRole,
): PublicAnnouncement[] {
  return announcements
    .filter((announcement) => {
      if (announcement.status !== "published") return false;
      if (announcement.audience === "all") return true;
      if (announcement.audience === "admins") return viewerRole === "admin";
      return viewerRole === "moderator" || viewerRole === "admin";
    })
    .map(({ id, title, message, updatedAt }) => ({ id, title, message, updatedAt }));
}