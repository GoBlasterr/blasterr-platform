---
name: Expo first-frame image readiness
description: Ensuring critical Expo web images are already decoded on the first frame after route navigation.
---

For images that must be visible on the first frame after an Expo Router transition, keep the same image component mounted across both routes and toggle only its visibility.

**Why:** On Expo web, hidden rendering and `Image.prefetch` can populate caches without making a newly mounted image element synchronously decoded. The new element may still report zero natural dimensions and appear several hundred milliseconds later.

**How to apply:** Mount transition-critical branding in a persistent layout above the router, load it while the prior screen is active, and reveal that same instance on the destination route. Preserve its position and accessibility state while hidden.