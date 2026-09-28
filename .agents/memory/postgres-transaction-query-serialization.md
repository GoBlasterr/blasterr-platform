---
name: PostgreSQL transaction query serialization
description: Avoid overlapping node-postgres client queries within one Drizzle transaction.
---

Inside a Drizzle `db.transaction` callback backed by node-postgres, await each query sequentially instead of wrapping multiple `tx.*` queries in `Promise.all`. A transaction is tied to one PostgreSQL client, and overlapping `client.query()` calls produce a deprecation warning.

**Why:** node-postgres warns that querying while the client is already executing will be removed in a future major version; it can also make transaction behavior harder to reason about.

**How to apply:** Keep transaction statements in explicit sequential `await` order. Use `Promise.all` only for independent queries using separate connections or outside a shared transaction.