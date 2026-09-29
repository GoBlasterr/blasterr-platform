---
name: Vercel ad-delivery boundary
description: Validating the separately deployed public frontend against the Replit API.
---

Treat the live Vercel frontend and the Replit API as separate releases. The workspace's frontend source and Replit deployment metadata do not prove which JavaScript bundle or API rewrite Vercel is currently serving. Use a stable published Replit API origin in Vercel's proxy configuration, not a development preview host.

**Why:** A live Vercel bundle still consumed only the first ad even after workspace source and the published API supported a second ad. The public custom domain appeared in Replit deployment metadata but responded as a Vercel site. Reading source or checking a development preview alone would have misdiagnosed the delivery issue.

**How to apply:** For public-site ad problems, inspect the live bundle and compare requests through Vercel with direct requests to the published API. Verify backend and frontend releases independently; changing workspace code does not by itself update either live deployment.