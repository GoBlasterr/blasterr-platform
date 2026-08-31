---
name: Development admin bypass
description: Safety and routing constraints for preview-only direct access to BLASTERR ADMIN.
---

Development-only direct Admin access must be controlled by an explicit flag exported by the API development run command. Production commands must never set that flag.

**Why:** Generic environment checks and workspace-scoped values did not reliably activate the preview API gate. The Admin overview also had an independent authorization check outside the main Admin router, causing repeated 401 responses after the primary middleware had already been bypassed.

**How to apply:** When changing Admin authorization, trace every endpoint used by the initial dashboard load rather than assuming the mounted Admin middleware is the only gate. Verify with a fresh unauthenticated browser context and a direct overview API request.