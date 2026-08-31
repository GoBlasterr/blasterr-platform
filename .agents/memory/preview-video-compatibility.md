---
name: Preview video compatibility
description: Browser-safe encoding guidance for videos that must play inside Replit app previews.
---

For user-supplied intro videos, provide a VP9/Opus WebM source for web preview while retaining the original H.264/AAC MP4 for native playback. Resolve bundled web media through `expo-asset` before rendering it.

**Why:** A valid, correctly served H.264/AAC MP4 with byte-range support still failed to decode in the Replit preview browser, while the WebM version played successfully. Browser policy also blocks reliable unmuted autoplay.

**How to apply:** Autoplay web video muted and permit a user gesture to unmute without exposing controls. Native Expo playback can use the original MP4 with sound.