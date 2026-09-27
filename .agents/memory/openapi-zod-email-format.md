---
name: OpenAPI email format codegen
description: Compatibility constraint when generating Zod schemas from OpenAPI email formats in this workspace.
---

Avoid adding `format: email` to OpenAPI properties that generate Zod schemas here: Orval emitted `zod.email()`, which is incompatible with the workspace's Zod 3 API. Keep the contract as a bounded string and validate email with a compatible route or UI validator unless codegen and Zod are upgraded together.

**Why:** A generated schema failed the workspace typecheck even though the OpenAPI spec itself validated.

**How to apply:** When an email format is needed, check the generated Zod output before relying on it; otherwise perform compatible string validation at the API boundary and in forms.