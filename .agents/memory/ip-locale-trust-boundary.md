---
name: IP locale trust boundary
description: Country-derived locale rules for BLASTERR web and mobile clients.
---

Interface locale must come from country metadata supplied by a recognized deployment proxy or CDN. A country header without matching proxy evidence is untrusted; when no trusted country is available, use a short-lived valid locale cookie, then English.

**Why:** Browser language is not proof of location, raw client country headers are forgeable, and permanently retaining an initial locale prevents correct behavior after travel.

**How to apply:** Validate ISO country codes, require provider-specific proxy evidence in production, avoid storing or logging raw IP addresses, let current country override the six-hour locale cookie, and apply locale before the client UI mounts where the static SPA architecture permits.