# BLASTERR

BLASTERR is a futuristic social platform where users publish Blasts about a person, place, business, product, event, or idea and discover the conversation around each Target.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the shared API server
- `pnpm --filter @workspace/blasterr run dev` — run the BLASTERR web app
- `pnpm run typecheck` — full workspace typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run generate` — generate a reviewed Drizzle migration
- `pnpm --filter @workspace/db run check:migrations` — verify checked-in migrations
- `pnpm --filter @workspace/db run migrate` — apply checked-in Drizzle migrations
- `pnpm --filter @workspace/db run validate:connection` — validate the configured Supabase pooler connection

## Stack

- React 19 + Vite + TypeScript + Tailwind CSS
- Express 5 API with an OpenAPI-first contract and generated React Query hooks
- PostgreSQL + Drizzle ORM
- Replit-managed Clerk authentication

## Where things live

- Web app: `artifacts/blasterr`
- API routes: `artifacts/api-server/src/routes`
- API contract: `lib/api-spec/openapi.yaml`
- Database schema: `lib/db/src/schema`
- Database migrations: `lib/db/drizzle`
- Brand theme: `artifacts/blasterr/src/index.css`
- Official logo: `artifacts/blasterr/public/logo.png`

## Architecture decisions

- A Blast belongs to a Target; Targets are first-class records rather than plain text tags.
- Blast Back records preserve their relationship to the original Blast.
- Media columns store URLs/metadata only; large file bytes do not belong in PostgreSQL.
- The current API provides a development dataset behind the real generated contract while the relational schema is ready for persistent production handlers.

## Product

- Public landing and branded Clerk sign-in/sign-up
- Feed, discovery, Trending, Nearby, global search
- Target pages and user profiles
- Create/edit/delete Blasts, reactions, bookmarks, follows, and Blast Back
- Notifications, safety/reporting foundations, and an admin command center
- Responsive desktop command-center layout and mobile bottom navigation

## Gotchas

- Re-run codegen after every OpenAPI change.
- Use generated client hooks from `@workspace/api-client-react`; do not hand-write API request types.
- Keep Clerk proxy middleware before body parsers and API routes.
- `SUPABASE_DATABASE_URL` is required for runtime and Drizzle tooling. Use the IPv4-compatible Supabase pooler URL; `DATABASE_URL` is not read.