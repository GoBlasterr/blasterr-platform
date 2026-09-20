---
name: External Stripe runtime
description: Runtime behavior of the connected Stripe integration in the Supabase-backed BLASTERR workspace
---

The workspace Stripe connection can be used by agent-side connector calls while a development workflow may not expose `REPLIT_CONNECTORS_HOSTNAME` and its runtime identity variables to the API process.

**Why:** Making Stripe sync mandatory during API startup caused the server to exit before opening its port, even though the Stripe product/price setup itself succeeded.

**How to apply:** Keep Stripe sync and managed-webhook provisioning best-effort during local startup. Checkout, portal, and webhook operations must still fail explicitly when the connected runtime is unavailable; never grant Business Pro access from a frontend payment state.