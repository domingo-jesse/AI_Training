---
name: Scalability hardening
description: All performance fixes applied to the AI Training Simulator — what was done and key constraints to preserve.
---

## What was done

**DB indexes (run directly via psql, 9 total)**
- `idx_attempts_org_id`, `idx_attempts_user_id`, `idx_attempts_submitted_at`, `idx_attempts_org_result_status`, `idx_attempts_user_module`
- `idx_modules_org_id`
- `idx_assignments_learner_active`, `idx_assignments_org_id`
- `idx_learner_profiles_last_activity`

**Why:** attempts, modules, and assignments tables had no indexes on their most-queried FK columns. Full table scans at scale.

**API user cache (middleware/auth.ts)**
- 60-second in-memory Map cache keyed on Clerk user ID
- `invalidateUserCache(clerkUserId)` exported — must be called whenever a user record is mutated (role change, deactivation)
- Max size 10,000 entries; evicts oldest on overflow

**Why:** `requireLocalUser` hit the DB on every authenticated request. Cache eliminates ~95% of these at low scale and all at high volume.

**Lazy loading (App.tsx)**
- Auth pages (LandingPage, SignInPage, AdminSignInPage, SignUpPage) remain eagerly loaded
- All 22 other pages wrapped in `React.lazy()` + single `<Suspense fallback={<PageFallback />}>` around the Switch
- PageFallback = centered spinner matching the app's dark theme

**Pagination on all list endpoints**
- All list routes now accept `?limit=N&offset=N`
- Default limit: 100; max limit: 200 (attempts/modules/assignments), 500 (members)
- Frontend doesn't need to pass these yet — defaults are generous enough for current scale

**Context memoization**
- `ImpersonationContext`: value object wrapped in `useMemo`; callbacks wrapped in `useCallback`
- `OrganizationContext`: same treatment; `switchOrg` uses `useCallback`

**Why:** both contexts are consumed app-wide. Inline value objects caused cascade re-renders on every parent update.

**Progress/org endpoint — SQL aggregation**
- `GET /progress/org` now uses a single SQL COUNT/AVG query instead of fetching all attempts into JS and filtering
- Returns `{ total, submitted, graded, inProgress, avgScore, attempts[] }` — recent paginated attempts are a separate query

**Owner stats cache (owner.ts)**
- 5-minute in-memory cache for `GET /owner/stats` (COUNT(*) full table scans)
- `invalidateStatsCache()` called on org create/delete

**Visibility-aware polling (OwnerLogsPage.tsx)**
- Auto-refresh interval skips the fetch when `document.visibilityState !== 'visible'`
- Triggers an immediate refresh when the user returns to the tab

## How to apply
- When adding new list routes: follow the `MAX_LIMIT / DEFAULT_LIMIT` pattern
- When mutating user records: call `invalidateUserCache(clerkUserId)` from middleware/auth.ts
- When adding new owner stats counters: remember stats cache is 5 min — bust it on writes
