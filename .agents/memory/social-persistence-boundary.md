---
name: Social persistence boundary
description: Which BLASTERR records are durable now, and which social/Clip metadata intentionally remains process-local.
---

Keep active BLASTERR social and BLASTR Clips metadata in process memory until the project explicitly schedules that domain migration. Administrative reports, audit events, moderation statuses, settings, feature controls, and announcements are the exception: they must remain PostgreSQL-backed and restart-safe. Generated media bytes belong in App Storage.

**Why:** Operational and moderation history cannot disappear on restart, while partially migrating user social content would create inconsistent ownership references and a split social model.

**How to apply:** Persist every privileged control-plane mutation and its actor-stamped audit event, preferably atomically. Social or Clip features may extend the in-memory domain and future-facing schema together until their dedicated migration.