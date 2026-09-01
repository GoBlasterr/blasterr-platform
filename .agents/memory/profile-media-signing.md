---
name: Profile media signing
description: Reliability rule for serving repeatedly rendered profile media from private App Storage.
---

Cache signed GET URLs for less than their signature lifetime and deduplicate concurrent signing and object-existence requests for the same immutable object. A profile-media reference is valid only when its asset is ready, owner-matched, purpose-matched, and still exists in storage.

**Why:** Signing can occasionally take multiple seconds, and profile/avatar reuse across components can otherwise create simultaneous requests that delay navigation. Metadata can also outlive deleted object bytes, so lifecycle status alone does not prevent broken images.

**How to apply:** Keep uploads on immutable paths; save completed asset identities rather than unverified paths; verify ownership, purpose, lifecycle, and existence at profile boundaries; cache/deduplicate successful existence and signing work; render an intentional fallback when validation fails.

Browser profile-image uploads must use the same-origin authenticated API upload route rather than PUT directly to an R2 presigned URL.

**Why:** The R2 bucket accepts signed PUT requests but its browser preflight returns 403 without CORS headers, which surfaces as the generic browser error “Failed to fetch.”

**How to apply:** Keep R2 as the backing store, proxy profile-image bytes through the API, return a normal JSON success response, then complete/verify the media asset before saving its reference.