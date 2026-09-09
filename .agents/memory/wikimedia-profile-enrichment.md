---
name: Wikimedia profile enrichment
description: Trusted-source and fallback rules for automatic curated profile images.
---

Wikimedia profile enrichment must accept both its upload and thumbnail delivery hosts, and fall back to Commons file search when a Wikipedia page has no supported raster lead image. People use exact canonical portraits; places use representative photos; sports teams, products, businesses, entertainment brands, and gaming entities prefer their current logo. Profile images and banners are separate assets.

**Why:** Wikipedia's page-image API can return images through its dedicated thumbnail host, while team pages and other subjects may expose only an SVG or no lead thumbnail. A team photo can also misrepresent a profile whose stable identity is its logo. Commons categories for people can contain related buildings, exhibits, or objects rather than the person, so a landscape-only rule can produce false banners.

**How to apply:** Keep an exact HTTPS host allowlist, enforce raster MIME and size limits after redirects, and rasterize trusted SVG logos through Wikimedia thumbnails. Prefer exact entity-named SVG/PNG files even when their names omit “logo”; otherwise require logo filenames to match the entity and exclude generic article icons. For person banners, prioritize the exact Wikipedia lead portrait so the face is visible; use landscape category search for non-people. Keep manual banner upload available for newer preferred photos. Store imported files inside BLASTERR rather than hotlinking.