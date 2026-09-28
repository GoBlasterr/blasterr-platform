---
name: Native TypeScript test imports
description: Node's native TypeScript stripping can fail to resolve extensionless relative imports in ESM tests.
---

The API test runner uses Node's native TypeScript stripping rather than a bundler. Extensionless relative imports from TypeScript modules can therefore fail ESM resolution before a test file executes.

**Why:** A module-not-found error during test loading is a test harness/import-resolution failure, not evidence that the changed feature's assertions failed.

**How to apply:** If the same extensionless-import resolution error appears, report it separately from the passing assertions and use typechecking or focused tests to verify the feature while deciding whether to fix the runner/import convention.