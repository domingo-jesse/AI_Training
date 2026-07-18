# AI Training Simulator

A full-stack SaaS platform for AI-powered workforce training simulations. Corporate learning teams use it to manage training programs; learners participate in assigned modules.

## Run & Operate

- `pnpm --filter @workspace/ai-training-simulator run dev` — run the React frontend (Vite, port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to dev database (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite + wouter (routing) + shadcn/ui + TanStack Query
- **Backend:** Express 5
- **DB:** PostgreSQL + Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build:** esbuild (CJS bundle)

## Where things live

```
artifacts/ai-training-simulator/src/
  components/      — shared UI components
  pages/           — one file per route (Landing, Dashboard, Admin, Learner, NotFound)
  hooks/           — custom React hooks
  services/        — (reserved for client-side service modules)
  App.tsx          — router + providers
  index.css        — theme tokens (HSL vars, fonts)

artifacts/api-server/src/
  routes/          — Express route handlers (health.ts, index.ts)
  middleware/      — errorHandler.ts, notFound.ts
  services/        — healthService.ts (business logic layer)
  app.ts           — Express app setup
  index.ts         — server entry point

lib/
  api-spec/        — openapi.yaml (source of truth for all API contracts)
  api-client-react/— generated React Query hooks (do not hand-edit)
  api-zod/         — generated Zod schemas used by the server (do not hand-edit)
  db/src/schema/   — Drizzle table definitions
```

## Architecture decisions

- **OpenAPI-first:** `lib/api-spec/openapi.yaml` is the single source of truth. Never hand-write types the codegen already produces.
- **Thin middleware layer:** Express middleware (`errorHandler`, `notFound`) are in `artifacts/api-server/src/middleware/`. Business logic lives in `services/`, not in route handlers.
- **No auth yet:** Landing page navigates directly to `/dashboard`. Auth will be added in a future iteration.
- **No AI features yet:** All AI-specific routes and services are reserved for future iterations.
- **DB schema starts empty:** `lib/db/src/schema/index.ts` is scaffolded but empty — tables will be added per feature.

## Product

- **Landing page** (`/`) — Hero + CTA, routes to dashboard
- **Dashboard** (`/dashboard`) — Welcome, stat cards, recent modules, live API status badge
- **Admin portal** (`/admin`) — Placeholder: manage users, programs, analytics, settings
- **Learner portal** (`/learner`) — Placeholder: my training, progress, certificates, schedule

## API Endpoints

| Method | Path          | Description          |
|--------|---------------|----------------------|
| GET    | /api/health   | Returns `{"status":"ok"}` |
| GET    | /api/healthz  | Legacy alias of /health |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any change to `lib/api-spec/openapi.yaml`, re-run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Never hand-edit files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`
- Do not call `configureWorkflow` for artifact services — managed workflows in `artifact.toml` provide the correct `PORT` and `BASE_PATH`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
