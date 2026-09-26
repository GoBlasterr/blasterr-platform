---
name: Nearby geocoding safeguards
description: Conditions for requesting and presenting OpenStreetMap-geocoded business locations in BLASTERR.
---

Only resolve one missing public business address during an explicit Nearby scan. Send the stored business address to OpenStreetMap, never the visitor's device coordinates. Accept only a street-level match with the requested house number; do not substitute a city or locality centroid. Cache successful coordinates on the Target row, identify BLASTERR in the request, globally enforce the provider's one-request-per-second limit, and show OpenStreetMap attribution and a clear disclosure in web and mobile Nearby.

**Why:** Kinamin approved using OpenStreetMap Nominatim for public business addresses. Its public endpoint requires identification, caching, attribution, and strict request pacing; sending precise browser location is outside that approval.

**How to apply:** Preserve single-record, user-triggered lookup rather than bulk geocoding. Keep the mobile and web disclosures aligned if the data provider or Nearby flow changes.