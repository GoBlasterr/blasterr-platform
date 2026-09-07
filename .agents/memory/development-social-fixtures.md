---
name: Development social fixtures
description: Why social sample users and content must not automatically seed in normal development previews.
---

Social fixture creation must require an explicit development-only opt-in. A normal preview should use the same empty-state behavior as the real product and must not recreate sample accounts or Blasts after cleanup.

**Why:** Automatically seeded social data made Admin, website, and mobile counts look real and returned deleted sample content on later requests.

**How to apply:** Keep fixture bootstrapping disabled by default, preserve anonymous empty-state handling, and use real database counts for operational telemetry.