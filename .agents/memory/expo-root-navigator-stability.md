---
name: Expo root navigator stability
description: Why preview-only route overrides must not replace the root Expo Router navigator.
---

Keep the Expo Router root `Stack` mounted across route changes. Implement preview-only authentication bypasses inside individual route screens rather than conditionally replacing the root navigator with page content.

**Why:** Removing the root navigator when the pathname changes resets routing back to the initial route, which can replay the splash screen indefinitely instead of reaching authentication.

**How to apply:** Any development-only preview state should preserve the root `Stack` or `Slot`; branch within route components and keep normal native and production redirects intact.