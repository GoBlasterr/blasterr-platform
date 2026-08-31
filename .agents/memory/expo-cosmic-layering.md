---
name: Expo cosmic layering
description: Reliable placement and animation of decorative mobile backgrounds across Expo tabs and web previews.
---

Render decorative backgrounds inside each Expo tab screen, above an explicit screen background color and below the screen content. Do not rely only on a backdrop beneath the root navigator.

**Why:** Expo/React Navigation scene containers can paint their own surface, hiding a root-level backdrop even when screen roots appear transparent. Expo web can also fail to visibly advance React Native Animated values in browser verification.

**How to apply:** Keep native animations on the native driver for iOS/Android. If the web preview must demonstrate motion, provide a small timer-driven web path and verify the animated parent layer rather than individual static particles.