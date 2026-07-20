#!/usr/bin/env bash
# =============================================================================
# sync-staging.sh — Copy production database → staging database
#
# Run this manually or via a cron job to keep staging in sync with prod.
#
# Usage:
#   PROD_DB_URL="postgres://..." STAGING_DB_URL="postgres://..." ./scripts/sync-staging.sh
#
# Or export both vars in your shell first, then just run:
#   ./scripts/sync-staging.sh
#
# SAFETY: This script DESTROYS all data in the staging database and replaces
# it with a copy of production. There is no undo. Do not point it at prod.
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

PROD_DB_URL="${PROD_DB_URL:?ERROR: PROD_DB_URL is not set}"
STAGING_DB_URL="${STAGING_DB_URL:?ERROR: STAGING_DB_URL is not set}"

DUMP_FILE="/tmp/prod_dump_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         AI Training Simulator — DB Sync          ║"
echo "║              Production → Staging                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📦 Source (prod):    ${PROD_DB_URL%%@*}@***"
echo "🎯 Target (staging): ${STAGING_DB_URL%%@*}@***"
echo "📁 Dump file:        $DUMP_FILE"
echo ""

# ── Safety check ─────────────────────────────────────────────────────────────
# Refuse to run if the two URLs are identical (would wipe prod with itself)

if [ "$PROD_DB_URL" = "$STAGING_DB_URL" ]; then
  echo "❌ ERROR: PROD_DB_URL and STAGING_DB_URL are the same. Aborting."
  exit 1
fi

# ── Confirm ───────────────────────────────────────────────────────────────────

read -r -p "⚠️  This will REPLACE all staging data. Are you sure? [yes/N]: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "⏳ Step 1/3 — Dumping production database..."
pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  "$PROD_DB_URL" > "$DUMP_FILE"

echo "✅ Dump complete: $(du -sh "$DUMP_FILE" | cut -f1)"

echo ""
echo "⏳ Step 2/3 — Restoring to staging..."
psql "$STAGING_DB_URL" < "$DUMP_FILE"

echo "✅ Restore complete."

echo ""
echo "⏳ Step 3/3 — Cleaning up dump file..."
rm -f "$DUMP_FILE"
echo "✅ Done."

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Staging is now a copy of production          ║"
echo "║  Synced at: $(date '+%Y-%m-%d %H:%M:%S %Z')          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
