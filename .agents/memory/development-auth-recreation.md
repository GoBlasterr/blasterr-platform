---
name: Development auth recreation
description: How profile synchronization handles stale email ownership created by development Clerk account recreation.
---

In development only, if an incoming auth identity already owns a profile row but its current Clerk email belongs to another row, keep the already-linked profile and its stored email rather than merging or deleting either row. Production must continue rejecting the conflict.

**Why:** Development Clerk accounts can be recreated or have emails reassigned, leaving two real auth-linked rows. Automatically merging them risks destroying valid profile data, while treating the stale preview state as a production-grade conflict prevents profile settings from loading.

**How to apply:** Keep fixture adoption and established-profile preservation explicitly gated to development. Never generalize this exception to production, and inspect both records before any later cleanup or merge.