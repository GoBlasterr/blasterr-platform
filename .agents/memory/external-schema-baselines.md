---
name: External schema baselines
description: Migration discipline for the existing Supabase schema used by BLASTERR
---

The Drizzle model may contain legacy tables that were created by a hand-written migration before the generated migration snapshot. A new generated migration can incorrectly attempt to recreate those tables.

**Why:** The first Business Pro migration included existing Business Target tables and failed on the external Supabase schema.

**How to apply:** Inspect the target database and the prior migration before applying a generated migration. Keep additive migrations limited to new objects or idempotent changes when the external schema already contains the legacy baseline.