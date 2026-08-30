---
name: Profile media signing
description: Reliability rule for serving repeatedly rendered profile media from private App Storage.
---

Cache signed GET URLs for less than their signature lifetime and deduplicate concurrent signing requests for the same immutable object.

**Why:** Replit App Storage signing can occasionally take multiple seconds, and profile/avatar reuse across components can otherwise create simultaneous signing calls that delay navigation.

**How to apply:** Keep uploaded media on immutable object paths, make successful redirects browser-cacheable for a duration shorter than signed URL expiry, and share any in-flight signing promise by object path.