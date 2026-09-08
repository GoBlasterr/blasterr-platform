---
name: Admin authentication boundary
description: Why BLASTERR separates Admin authentication from public-client authentication.
---

Use Supabase Auth only for the Admin control center. Keep the public website and mobile app on Clerk, and require the API to authorize Admin requests from a verified Supabase session and approved-email allowlist. Recovery links must carry only an encrypted, expiring server ticket; exchange the Supabase recovery token server-side before redirecting to the Admin reset page.

**Why:** Admin password ownership and recovery needed to be independent from public user accounts without risking a broad authentication migration across customer-facing clients. Supabase's hosted mail layer rejected the original Admin domain and its configured site URL forced generated actions to localhost; returning raw generated links would expose account-takeover credentials.

**How to apply:** Admin authentication changes must preserve HTTP-only cookie sessions, server-side allowlist checks, same-origin mutation protection, generic anti-enumeration responses, and recovery rate limits. Deliver recovery mail only through a server-side provider whose connected sender is verified against the approved recipient. Never log, return, or persist raw recovery tokens. Do not remove Clerk middleware needed by website and mobile routes.