# Environments — AI Training Simulator

## Overview

| Environment | Purpose | URL | Database |
|---|---|---|---|
| **Development** | Where you build and test | `https://8260a0ae-...replit.dev` | Supabase (shared dev DB) |
| **Staging** | QA before releasing to customers | `https://ai-training-hub-staging--darkends1.replit.app` *(after setup)* | Supabase staging DB (separate) |
| **Production** | What customers see | `https://ai-training-hub--darkends1.replit.app` | Supabase production DB |

---

## Environment Variables

| Variable | Dev | Staging | Prod |
|---|---|---|---|
| `APP_ENV` | `development` | `staging` | `production` |
| `NODE_ENV` | `development` | `production` | `production` |
| `LOG_LEVEL` | `debug` | `warn` | `warn` |
| `SUPABASE_DATABASE_URL` | Dev DB URL | **Staging DB URL** | Prod DB URL |
| `CLERK_PUBLISHABLE_KEY` | Same | Same | Same |
| `OPENAI_API_KEY` | Same | Same | Same |
| `DEEPGRAM_API_KEY` | Same | Same | Same |

> **Key rule:** Staging and Production must have **separate Supabase databases**.  
> Never point staging at the prod DB — a bad migration or script would corrupt real customer data.

---

## Day-to-Day Workflow

```
[Dev workspace]  →  test locally  →  git push main  →  [Prod auto-deploys]
                                  ↓
                            push to staging branch
                                  ↓
                         [Staging deploys]  →  QA test  →  promote to prod
```

### Simple workflow (just you, no team):
1. Build in the Replit dev workspace
2. When ready: **git push main** → Replit auto-deploys to prod
3. If something looks off: check prod URL directly before shipping

### Full workflow (once you have customers):
1. Build and test in dev
2. Push to `staging` branch → staging Repl auto-deploys
3. Test on staging URL
4. Merge `staging` → `main` → prod auto-deploys

---

## Setting Up Staging (Step by Step)

### Step 1 — Create a staging Supabase database
1. Go to [supabase.com](https://supabase.com)
2. Create a new project called `ai-training-staging`
3. Copy the **Session Pooler** connection string (same format as your prod DB URL)
4. Save it — you'll need it in Step 3

### Step 2 — Fork this Repl as staging
1. In Replit, click the **⋮** menu on your Repl → **Fork**
2. Name it `ai-training-simulator-staging`
3. This creates an identical copy with all your code

### Step 3 — Configure staging environment
In the **forked Repl** (not this one), go to **Secrets** and update:
- `SUPABASE_DATABASE_URL` → paste your staging Supabase connection string
- Add a new secret: `APP_ENV` = `staging`

### Step 4 — Deploy staging
In the forked Repl, click the **Deploy** button.  
Your staging URL will be something like:  
`https://ai-training-simulator-staging--darkends1.replit.app`

### Step 5 — Run the initial DB sync
```bash
PROD_DB_URL="your-prod-supabase-url" \
STAGING_DB_URL="your-staging-supabase-url" \
./scripts/sync-staging.sh
```

---

## Syncing Staging with Production

When you want to refresh staging with real production data:

```bash
# Set your DB URLs (or export them in your shell)
export PROD_DB_URL="postgres://..."
export STAGING_DB_URL="postgres://..."

# Run the sync script
./scripts/sync-staging.sh
```

The script will:
1. Dump the production DB to a temp file
2. Restore it into staging (wiping staging first)
3. Delete the temp file
4. Confirm completion

**To run this weekly automatically**, set up a cron job on any server or use a free service like [cron-job.org](https://cron-job.org) to hit a webhook that triggers the script.

> ⚠️ The sync is one-way and destructive: **prod → staging only**. Staging data is always expendable.

---

## Connecting to GitHub

### Why bother?
- Every push is version-controlled — you can roll back any change
- GitHub is the source of truth; Replit deploys from it
- Lets you create branches (staging, feature branches)

### How to connect:

**Step 1 — Create a GitHub repo**
1. Go to [github.com/new](https://github.com/new)
2. Name it `ai-training-simulator`
3. Keep it **Private**
4. Don't initialise with README (your code is already here)
5. Click **Create repository**
6. Copy the repo URL: `https://github.com/yourusername/ai-training-simulator.git`

**Step 2 — Connect GitHub to Replit**
1. In Replit, click your avatar (top right) → **Account settings**
2. Under **Connected accounts** → connect GitHub
3. Authorise Replit to access your repos

**Step 3 — Set the GitHub remote in your Repl**
Open the Replit shell and run:
```bash
git remote add github https://github.com/yourusername/ai-training-simulator.git
git push github main
```

**Step 4 — Set GitHub as the primary remote**
```bash
git remote set-url origin https://github.com/yourusername/ai-training-simulator.git
git push -u origin main
```

From now on, `git push` from the Replit shell pushes to GitHub.

---

## Pushing Code Safely

### Before you push, always:
```bash
# Make sure the API server builds cleanly
pnpm --filter @workspace/api-server run build

# Check for TypeScript errors in the frontend  
pnpm --filter @workspace/ai-training-simulator run build
```

### Then push:
```bash
git add -A
git commit -m "feat: describe what you built"
git push origin main
```

Replit will auto-deploy to production on push (once you've configured it in deployment settings).

---

## Checklist Before Shipping Anything to Prod

- [ ] Tested the feature in dev workspace
- [ ] No TypeScript errors (`pnpm build` passes)
- [ ] API server compiles cleanly  
- [ ] Tested on staging URL (if available)
- [ ] Database migrations applied to prod (if schema changed)
- [ ] `git push origin main` done
- [ ] Checked prod URL after deploy

---

## Emergency: Rolling Back Production

If something breaks in production:
1. In Replit, go to **Deployments** → **History**
2. Find the last working build
3. Click **Redeploy** on that build

This takes ~60 seconds and requires zero code changes.
