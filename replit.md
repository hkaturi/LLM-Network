# LLM Worker Hub

LLM Worker Hub helps freelance contributors onboard, find matched daily model-training tasks, submit work, and move through review.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/llm-worker-hub` — React/Vite worker and operator experience.
- `artifacts/api-server/src/routes/worker.ts` — worker profile, dashboard, task claiming, and submissions.
- `artifacts/api-server/src/routes/admin.ts` — task publishing and review queue.
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and schemas.
- `lib/db/src/schema/` — Drizzle tables for workers, tasks, and submissions.

## Architecture decisions

- Clerk is the account system; API requests use browser session cookies rather than custom bearer-token handling.
- A demo worker is used only when the API receives no Clerk session so the preview has seeded, usable data.
- Task and submission routes are backed by PostgreSQL and return generated OpenAPI-shaped responses.

## Product

Workers can create an account, complete profile readiness, set availability, browse matched tasks, claim work, submit responses, and see review status. Dispatchers can publish tasks, monitor worker availability and workload, track task flow, and approve or reject submissions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Keep generated API files read-only; update the OpenAPI contract instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
