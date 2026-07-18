# AI Training Simulator — Rebuild Plan

## Overview
Role-based SaaS platform: Admins build and assign training modules; Learners complete them; AI assists with module generation, conversation, and grading.

---

## Architecture

### Monorepo Mapping
```
artifacts/ai-training-simulator/src/   ← React + Vite frontend ("client")
  pages/
    landing/          LandingPage.tsx
    auth/             (Clerk sign-in / sign-up)
    admin/            Admin pages (12 total)
    learner/          Learner pages (8 total)
  components/
    layout/           AdminLayout, LearnerLayout, AppShell
    ui/               shadcn primitives
    shared/           KPI cards, tables, badges, filters
  hooks/              useCurrentUser, useOrg, useRole, etc.
  services/           thin wrappers over API hooks

artifacts/api-server/src/              ← Express 5 backend ("server")
  routes/
    health.ts
    users.ts          /users/me, /users/sync
    organizations.ts
    modules.ts        CRUD + builder
    assignments.ts
    attempts.ts
    grading.ts
    progress.ts
    generation.ts     AI module generation
    dev.ts            DB debug, logs, QA (developer-only)
  middleware/
    auth.ts           requireAuth, requireRole, requireOrg
    errorHandler.ts
    notFound.ts
    clerkProxyMiddleware.ts
  services/
    authService.ts    JIT user provisioning
    moduleService.ts
    assignmentService.ts
    gradingService.ts
    progressService.ts
    aiService.ts      OpenAI calls
    auditService.ts   structured event logging

lib/
  db/src/schema/      19 Drizzle table definitions
  api-spec/           OpenAPI spec (single source of truth)
  api-client-react/   generated React Query hooks
  api-zod/            generated Zod schemas
```

---

## Database Schema (19 Tables)

### organizations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| name | text | NOT NULL |
| slug | text | unique |
| settings | jsonb | org-level config |
| created_at / updated_at | timestamptz | |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| clerk_id | text | unique, links to Clerk |
| email | text | NOT NULL |
| name | text | |
| username | text | |
| role | text | 'admin' \| 'learner' \| 'developer' |
| team | text | |
| organization_id | uuid FK → organizations | |
| auth_provider | text | 'clerk' \| 'google' |
| is_active | boolean | default true |
| created_at / updated_at | timestamptz | |

### modules, module_questions, module_rubric_criteria, investigation_actions
See lib/db/src/schema/modules.ts

### assignments, module_assignments, assignment_workspace_state
See lib/db/src/schema/assignments.ts

### attempts, action_logs
See lib/db/src/schema/attempts.ts

### submission_scores, submission_question_scores, submission_regrade_history
See lib/db/src/schema/submissions.ts

### learner_profiles, module_progress
See lib/db/src/schema/progress.ts

### module_generation_runs, module_generation_questions
See lib/db/src/schema/generation.ts

### question_conversation_messages
See lib/db/src/schema/conversations.ts

---

## Roles & Permissions

| Feature | Admin | Learner | Developer |
|---------|-------|---------|-----------|
| Admin dashboard | ✓ | - | ✓ |
| Module builder | ✓ | - | ✓ |
| Assign modules | ✓ | - | ✓ |
| Grading center | ✓ | - | ✓ |
| Progress tracking | ✓ | - | ✓ |
| Account management | ✓ | - | ✓ |
| Learner workspace | - | ✓ | ✓ |
| Learner progress | - | ✓ | ✓ |
| DB tables / debug / QA | - | - | ✓ |

All data is organization-scoped: every query filters by org_id derived from the authenticated user.

---

## Authentication Flow (Clerk)
1. Unauthenticated user hits `/` → sees marketing landing page
2. Clicks Sign In → `/sign-in` (Clerk-powered, branded)
3. After auth, Clerk redirects to app → frontend calls `POST /api/users/sync`
4. Sync endpoint JIT-provisions user in our DB (creates or updates `users` row)
5. Frontend calls `GET /api/users/me` → gets role + org
6. App redirects: admin/developer → `/admin/dashboard`, learner → `/learner/home`

---

## Milestones

### ✅ M0 — Foundation (DONE)
- [x] React+Vite frontend artifact
- [x] Express API server
- [x] Landing page, dashboard placeholder, admin placeholder, learner placeholder
- [x] GET /api/health endpoint verified

### 🔄 M1 — Auth + Roles + Org Isolation (CURRENT)
- [ ] Clerk auth provisioned and wired (frontend + backend)
- [ ] All 19 DB tables defined and pushed
- [ ] POST /api/users/sync — JIT user provisioning
- [ ] GET /api/users/me — role + org profile
- [ ] requireAuth / requireRole / requireOrg middleware
- [ ] Branded sign-in / sign-up pages (Clerk)
- [ ] Role-based routing (admin layout vs learner layout)
- [ ] Organization-level data isolation pattern established

### M2 — Admin Core: Accounts + Modules + Assignments
- [ ] Account management (CRUD users, teams, roles)
- [ ] Module builder (create/edit/publish/archive)
- [ ] Module question editor (open_text, multiple_choice, ai_conversation)
- [ ] Module rubric criteria editor
- [ ] Assignment creation (select module + learners, due date)
- [ ] Assignment list with status tracking

### M3 — Learner Workspace + Submission Flow
- [ ] Learner home (assigned modules, progress summary)
- [ ] Module workspace wizard (Scenario Overview → Assessment → Review → Submit)
- [ ] Persistent workspace state (resume support)
- [ ] open_text and multiple_choice question rendering
- [ ] Attempt creation on submission
- [ ] Action log recording

### M4 — Grading Center (Manual)
- [ ] Submission grading list (pending review)
- [ ] Per-question scoring and feedback
- [ ] Admin approve / return / regrade flows
- [ ] Regrade history
- [ ] Visibility flag controls (what learners can see)
- [ ] Learner results view (respects visibility flags)

### M5 — AI Features
- [ ] AI conversation questions in workspace (OpenAI with local fallback)
- [ ] AI module generation (full draft from admin prompt)
- [ ] Module preview generation
- [ ] AI grading (LLM-scored questions)
- [ ] AI grading criteria generation per question

### M6 — Progress, Analytics & Results
- [ ] Admin progress tracking (learner/team/module/completion)
- [ ] Learner progress & results page
- [ ] Summary metrics (KPI cards)
- [ ] Filters by team, status, module
- [ ] Completion rate calculations

### M7 — Developer Tools, Seed Data, Polish
- [ ] DB tables viewer (developer only)
- [ ] Debug log viewer (structured, downloadable)
- [ ] QA Test Center
- [ ] Seed data script (org, users, modules, assignments, attempts)
- [ ] Safe seed-clear utility
- [ ] Audit event log
- [ ] README / setup docs
- [ ] Critical tests (permissions, status, visibility flags)

---

## Environment Variables Required
| Key | Purpose | Source |
|-----|---------|--------|
| DATABASE_URL | Postgres | Auto-provisioned by Replit |
| CLERK_SECRET_KEY | Clerk backend | Auto-provisioned by setupClerkWhitelabelAuth |
| CLERK_PUBLISHABLE_KEY | Clerk frontend | Auto-provisioned |
| VITE_CLERK_PUBLISHABLE_KEY | Clerk frontend (Vite) | Auto-provisioned |
| OPENAI_API_KEY | AI features | User-provided (M5) |
| OPENAI_MODEL | AI model name | User-provided (M5, optional) |

---

## Key Design Decisions
1. **Clerk for auth** — handles email/password + Google OAuth; our DB tracks role/org
2. **Organization isolation** — every service function takes org_id from the auth context, never from request body
3. **OpenAPI-first** — all contracts defined in lib/api-spec/openapi.yaml before implementation
4. **Service layer** — route handlers are thin; business logic in services/
5. **JSONB for flexible data** — answers, action_logs, content_sections, visibility_flags stored as JSONB
6. **Drizzle ORM** — type-safe queries, push-based schema management in dev
7. **No direct DB access from frontend** — all data flows through the Express API
