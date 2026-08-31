import assert from "node:assert/strict";
import test from "node:test";
import {
  filterPublishedAnnouncementsForViewer,
  resolveAnnouncementViewerRole,
} from "./announcement-visibility.ts";

const announcements = [
  {
    id: "public-published",
    title: "Public",
    message: "Visible to everyone.",
    audience: "all",
    status: "published",
    updatedAt: "2026-08-31T10:00:00.000Z",
  },
  {
    id: "admin-published",
    title: "Admin",
    message: "Visible to admins.",
    audience: "admins",
    status: "published",
    updatedAt: "2026-08-31T10:00:00.000Z",
  },
  {
    id: "moderator-published",
    title: "Moderator",
    message: "Visible to moderators and admins.",
    audience: "moderators",
    status: "published",
    updatedAt: "2026-08-31T10:00:00.000Z",
  },
  {
    id: "public-draft",
    title: "Draft",
    message: "Never visible.",
    audience: "all",
    status: "draft",
    updatedAt: "2026-08-31T10:00:00.000Z",
  },
];

test("published announcements are filtered by viewer role", () => {
  assert.deepEqual(
    filterPublishedAnnouncementsForViewer(announcements, "user").map(({ id }) => id),
    ["public-published"],
  );
  assert.deepEqual(
    filterPublishedAnnouncementsForViewer(announcements, "moderator").map(({ id }) => id),
    ["public-published", "moderator-published"],
  );
  assert.deepEqual(
    filterPublishedAnnouncementsForViewer(announcements, "admin").map(({ id }) => id),
    ["public-published", "admin-published", "moderator-published"],
  );
});

test("public announcement payloads do not expose status or audience controls", () => {
  assert.deepEqual(Object.keys(filterPublishedAnnouncementsForViewer(announcements, "admin")[0]).sort(), [
    "id",
    "message",
    "title",
    "updatedAt",
  ]);
});

test("suspended moderators receive only public announcements", () => {
  const viewerRole = resolveAnnouncementViewerRole({
    role: "moderator",
    status: "suspended",
  });

  assert.equal(viewerRole, "user");
  assert.deepEqual(
    filterPublishedAnnouncementsForViewer(announcements, viewerRole).map(({ id }) => id),
    ["public-published"],
  );
});
