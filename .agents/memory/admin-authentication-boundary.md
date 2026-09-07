---
name: Admin authentication boundary
description: Why BLASTERR separates Admin authentication from public-client authentication.
---

Use Supabase Auth only for the Admin control center. Keep the public website and mobile app on Clerk, and require the API to authorize Admin requests from a verified Supabase session and approved-email allowlist.

**Why:** Admin password ownership and recovery needed to be independent from public user accounts without risking a broad authentication migration across customer-facing clients.

**How to apply:** Admin authentication changes must preserve HTTP-only cookie sessions, server-side allowlist checks, and same-origin mutation protection. Do not remove Clerk middleware needed by website and mobile routes.