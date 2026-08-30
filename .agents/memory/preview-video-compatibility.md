---
name: Preview video compatibility
description: Browser-safe encoding guidance for videos that must play inside Replit app previews.
---

For user-supplied intro videos, provide a VP9/Opus WebM source before the original H.264/AAC MP4 source.

**Why:** A valid, correctly served H.264/AAC MP4 with byte-range support still failed to decode in the Replit preview browser, while the WebM version played successfully.

**How to apply:** Keep the original MP4 as a fallback, but list WebM first in the video element when reliable preview playback is required.