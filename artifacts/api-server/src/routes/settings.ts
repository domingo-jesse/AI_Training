import { Router, type IRouter } from "express";
import { db, orgSettings, organizationMemberships, organizations } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireLocalUser } from "../middleware/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// Ensure the org_settings table exists (idempotent)
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS org_settings (
        org_id bigint PRIMARY KEY REFERENCES organizations(organization_id) ON DELETE CASCADE,
        passing_score integer NOT NULL DEFAULT 70,
        allow_multiple_attempts boolean NOT NULL DEFAULT true,
        max_attempts integer NOT NULL DEFAULT 3,
        default_difficulty text NOT NULL DEFAULT 'intermediate',
        default_time_limit integer NOT NULL DEFAULT 0,
        show_score_to_learner boolean NOT NULL DEFAULT true,
        show_feedback_to_learner boolean NOT NULL DEFAULT true,
        updated_at timestamptz DEFAULT now()
      )
    `);
  } catch (e) {
    console.error("org_settings table init error:", e);
  }
})();

async function checkAdmin(res: any, orgId: number, userId: number): Promise<boolean> {
  const [m] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "active"),
      )
    )
    .limit(1);
  if (!m || !["owner", "admin", "manager"].includes(m.role)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

const DEFAULTS = {
  passingScore: 70,
  allowMultipleAttempts: true,
  maxAttempts: 3,
  defaultDifficulty: "intermediate",
  defaultTimeLimit: 0,
  showScoreToLearner: true,
  showFeedbackToLearner: true,
};

/**
 * GET /api/settings?orgId=N
 * Returns org settings, creating defaults on first access.
 */
router.get("/settings", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }
  if (!await checkAdmin(res, orgId, localUser.userId)) return;

  // Fetch org name alongside
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.organizationId, orgId))
    .limit(1);

  // Upsert defaults on first read
  await pool.query(
    `INSERT INTO org_settings (org_id) VALUES ($1) ON CONFLICT (org_id) DO NOTHING`,
    [orgId]
  );

  const [row] = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);

  res.json({ ...DEFAULTS, ...row, orgName: org?.name ?? "" });
});

/**
 * PATCH /api/settings?orgId=N
 * Update one or more settings fields.
 */
router.patch("/settings", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }
  if (!await checkAdmin(res, orgId, localUser.userId)) return;

  const allowed = [
    "passingScore", "allowMultipleAttempts", "maxAttempts",
    "defaultDifficulty", "defaultTimeLimit",
    "showScoreToLearner", "showFeedbackToLearner",
  ] as const;

  const updates: Partial<typeof DEFAULTS> = {};
  for (const key of allowed) {
    if (key in req.body) (updates as any)[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  // Ensure row exists
  await pool.query(
    `INSERT INTO org_settings (org_id) VALUES ($1) ON CONFLICT (org_id) DO NOTHING`,
    [orgId]
  );

  const [updated] = await db
    .update(orgSettings)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(orgSettings.orgId, orgId))
    .returning();

  res.json(updated);
});

export default router;
