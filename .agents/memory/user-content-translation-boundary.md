---
name: User-content translation boundary
description: Privacy and integrity constraints for BLASTERR user-content translation.
---

Translation is an additive viewing layer. Preserve canonical user text unchanged, request translation only when a viewer chooses it, and keep translated text in bounded volatile cache rather than persistent storage.

**Why:** User content must remain attributable to what its author actually wrote, and sending or retaining unnecessary text creates avoidable privacy and integrity risk.

**How to apply:** Add Translate/See Original at centralized renderers, detect viewer locale without storing IP or country, never expose provider credentials to clients, and never include raw user text in logs or cache keys.