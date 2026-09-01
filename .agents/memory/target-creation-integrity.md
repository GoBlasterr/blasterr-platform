---
name: Target creation integrity
description: Safety rules for serialized Target creation, duplicate reporting, and development authentication.
---

Target identity advisory-lock keys must be valid PostgreSQL text (never null-byte-delimited), and only a recognized duplicate-identity error may produce a duplicate response. Unexpected failures must be logged and returned as server errors.

**Why:** PostgreSQL rejected a null byte in the lock key before inserting a legitimate Target, while a broad catch converted that database error into a false “already registered” response.

**How to apply:** Build lock keys with an unambiguous text encoding such as JSON, retain the normalized database uniqueness constraint, and discriminate duplicate errors explicitly in the route.

User-generated mutations must require a real authenticated identity in every environment. Development fixture users may support read-only previews but must not authorize Targets, Blasts, reactions, comments, bookmarks, reports, or other user content.

**Why:** A generic development fallback made an anonymous browser act as the seeded demo user and allowed content creation without signing in.

**How to apply:** Gate mutations on the authentication provider's actual user ID, not merely on a resolved social profile or the development environment.