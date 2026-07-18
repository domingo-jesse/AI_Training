---
name: Supabase schema source of truth
description: The Drizzle schema is introspected from Supabase — key column naming differences from our hand-written schema.
---

Schema file: `lib/db/src/schema/supabase.ts` (introspected via drizzle-kit introspect).
Relations file: `lib/db/src/schema/relations.ts`.
Index re-exports both.

Key differences from our original hand-written schema:
- `users.userId` (bigint) = internal PK (auto-identity)
- `users.id` (text) = external/Clerk user ID — this is where Clerk's userId is stored
- `users` has NO `clerkId` column — match on `eq(usersTable.id, clerkUserId)`
- `organizations.organizationId` (bigint) = PK; only has `name` (no slug/settings)
- `modules.moduleId` (bigint) = PK; `modules.id` (text) = external UUID
- `learner_dashboard_summary` is a VIEW, not a table — Drizzle tracks it as pgView
- `submission_settings` is an extra table not in our original schema

**Why:** Supabase DB was the existing Streamlit prototype's database with richer real-world schema. We introspect rather than push to preserve existing data.
**How to apply:** Any query on users must use `usersTable.id` (text) for Clerk ID lookups, and `usersTable.userId` for internal FK joins.
