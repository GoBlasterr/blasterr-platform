---
name: Wikimedia profile enrichment
description: Trusted-source and fallback rules for automatic curated profile images.
---

Wikimedia profile enrichment must accept both its upload and thumbnail delivery hosts, and fall back to Commons file search when a Wikipedia page has no supported raster lead image. People use portraits and places use representative photos; sports teams, products, businesses, entertainment brands, and gaming entities prefer their current logo. Profile images and wide banners are separate assets.

**Why:** Wikipedia's page-image API can return images through its dedicated thumbnail host, while team pages and other subjects may expose only an SVG or no lead thumbnail. A team photo can also misrepresent a profile whose stable identity is its logo. Reusing a portrait or logo as a full-width cover forces visibly poor cropping.

**How to apply:** Keep an exact HTTPS host allowlist, enforce raster MIME and size limits after redirects, and rasterize trusted SVG logos through Wikimedia thumbnails. Prefer exact entity-named SVG/PNG files even when their names omit “logo”; otherwise require logo filenames to match the entity and exclude generic article icons. For banners, resolve the exact Wikipedia entity through Wikidata's Commons category before broader searches, require a landscape raster, and store it separately. Keep updates review-first and store imported files inside BLASTERR rather than hotlinking.