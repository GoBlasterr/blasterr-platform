---
name: User-content translation boundary
description: Privacy and integrity constraints for BLASTERR user-content translation.
---

Translation is an additive viewing layer. Preserve canonical user text unchanged, request its translation only when a viewer chooses it, and keep translated text in bounded volatile cache rather than persistent storage. Automatic interface translation may process only literal copy proven to exist in the website source.

**Why:** User content must remain attributable to what its author actually wrote, and sending or retaining unnecessary text creates avoidable privacy and integrity risk. An unrestricted DOM translator could silently modify usernames, posts, prices, or API data.

**How to apply:** Add Translate/See Original at centralized user-content renderers, detect viewer locale without storing IP or country, and validate automatic UI-translation requests against extracted literal source copy. Mark user-content renderers as excluded from automatic UI translation. Never expose provider credentials to clients or include raw user text in logs or cache keys.