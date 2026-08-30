---
name: Social persistence boundary
description: Why BLASTERR social and BLASTR Clips metadata currently use process memory despite having relational schemas.
---

Keep the active BLASTERR social and BLASTR Clips metadata path in process memory until the project explicitly schedules the persistence migration. Generated media bytes belong in App Storage, and relational schemas should stay aligned with the API model so the migration is straightforward.

**Why:** The project deliberately prioritizes a coherent working product before moving the existing social domain to PostgreSQL; changing only Clips would create a split persistence model and inconsistent ownership references.

**How to apply:** New social or clip features may extend the in-memory domain and the future-facing schema together. Treat restart durability and recoverable render jobs as the scope of a dedicated persistence migration, not an incidental partial conversion.