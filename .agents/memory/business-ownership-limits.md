---
name: Business ownership limits
description: Concurrency and privacy rules for capped Business Target ownership.
---

Enforce the Business Target ownership cap across every path that can activate ownership or make an owned page active, not only self-service creation. Existing-target operations must lock the target owner set before owner-capacity locks; multi-owner checks lock owners in deterministic order.

**Why:** Creation, claim approval, admin assignment, and archived-page reactivation can race. Checking only the direct creation path or using a pre-transaction status snapshot can let an owner exceed the cap.

**How to apply:** Any new ownership-grant or page-reactivation path must join the shared lock/count protocol. Protected owned-list, Business Center, and analytics caches must be scoped to the authenticated user and cleared on identity transitions.