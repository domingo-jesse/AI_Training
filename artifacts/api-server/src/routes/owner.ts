import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { organizations, users, modules, attempts, organizationMemberships } from "@workspace/db";
import { eq, sql, desc, count } from "drizzle-orm";
import { requireLocalUser } from "../middleware/auth";
import { logEvent } from "../services/logEvent";

const router: IRouter = Router();

// ── Platform owner emails (comma-separated) ────────────────────────────────
const OWNER_EMAILS = (process.env.PLATFORM_OWNER_EMAILS ?? "domingo.jesse@gmail.com")
  .split(",")
  .map(e => e.trim().toLowerCase());

async function requirePlatformOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const localUser = (req as any).localUser;
  const email = localUser?.email?.toLowerCase() ?? "";
  if (!email || !OWNER_EMAILS.includes(email)) {
    res.status(403).json({ error: "Platform owner access required." });
    return;
  }
  next();
}

// ── Stats cache (5-minute TTL) ─────────────────────────────────────────────
interface StatsCache { data: Record<string, number>; expiresAt: number }
let statsCache: StatsCache | null = null;
const STATS_TTL = 5 * 60 * 1000;

export function invalidateStatsCache() { statsCache = null; }

// ── GET /api/owner/check ───────────────────────────────────────────────────
router.get("/owner/check", requireLocalUser, requirePlatformOwner, (_req, res) => {
  res.json({ ok: true });
});

// ── GET /api/owner/stats ───────────────────────────────────────────────────
router.get("/owner/stats", requireLocalUser, requirePlatformOwner, async (_req, res): Promise<void> => {
  if (statsCache && Date.now() < statsCache.expiresAt) {
    res.json(statsCache.data);
    return;
  }

  const [[orgCount], [userCount], [moduleCount], [attemptCount], [todayAttempts]] = await Promise.all([
    db.select({ count: count() }).from(organizations),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(modules),
    db.select({ count: count() }).from(attempts),
    db.select({ count: count() }).from(attempts)
      .where(sql`submitted_at >= NOW() - INTERVAL '24 hours'`),
  ]);

  const errorResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM system_logs
    WHERE level = 'error' AND created_at >= NOW() - INTERVAL '24 hours'
  `);
  const errorsToday = Number((errorResult.rows[0] as any)?.count ?? 0);

  const data = {
    orgs: Number(orgCount.count),
    users: Number(userCount.count),
    modules: Number(moduleCount.count),
    attempts: Number(attemptCount.count),
    attemptsToday: Number(todayAttempts.count),
    errorsToday,
  };

  statsCache = { data, expiresAt: Date.now() + STATS_TTL };
  res.json(data);
});

// ── GET /api/owner/orgs ────────────────────────────────────────────────────
// Returns per-org aggregates including error_count (errors in last 7 days)
router.get("/owner/orgs", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string || "100", 10), 500);
  const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

  const rows = await db.execute(sql.raw(`
    SELECT
      o.organization_id,
      o.name,
      COUNT(DISTINCT om.user_id) FILTER (WHERE om.status = 'active') AS member_count,
      COUNT(DISTINCT m.module_id)                                     AS module_count,
      COUNT(DISTINCT a.attempt_id)                                    AS attempt_count,
      COUNT(DISTINCT asgn.assignment_id)                              AS assignment_count,
      COUNT(DISTINCT sl.log_id)
        FILTER (WHERE sl.level = 'error'
                  AND sl.created_at >= NOW() - INTERVAL '7 days')    AS error_count
    FROM organizations o
    LEFT JOIN organization_memberships om   ON om.organization_id   = o.organization_id
    LEFT JOIN modules m                     ON m.organization_id    = o.organization_id
    LEFT JOIN attempts a                    ON a.organization_id    = o.organization_id
    LEFT JOIN assignments asgn              ON asgn.organization_id = o.organization_id
    LEFT JOIN system_logs sl               ON sl.org_id            = o.organization_id
    GROUP BY o.organization_id, o.name
    ORDER BY o.organization_id ASC
    LIMIT ${limit} OFFSET ${offset}
  `));

  res.json(rows.rows);
});

// ── GET /api/owner/orgs/:id ────────────────────────────────────────────────
router.get("/owner/orgs/:id", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const orgId = parseInt(req.params.id, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid org ID" }); return; }

  const [org] = await db.select().from(organizations).where(eq(organizations.organizationId, orgId)).limit(1);
  if (!org) { res.status(404).json({ error: "Org not found" }); return; }

  const [members, moduleRows] = await Promise.all([
    db.select({
      userId: users.userId,
      name: users.name,
      email: users.email,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      createdAt: users.createdAt,
    }).from(organizationMemberships)
      .innerJoin(users, eq(users.userId, organizationMemberships.userId))
      .where(eq(organizationMemberships.organizationId, orgId))
      .limit(200),

    db.select({
      moduleId: modules.moduleId,
      title: modules.title,
      status: modules.status,
      difficulty: modules.difficulty,
    }).from(modules).where(eq(modules.organizationId, orgId)).limit(200),
  ]);

  res.json({ org, members, modules: moduleRows });
});

// ── POST /api/owner/orgs ───────────────────────────────────────────────────
router.post("/owner/orgs", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const { name, adminEmail } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Organization name is required" }); return; }

  const [newOrg] = await db.insert(organizations).values({ name: name.trim() }).returning();
  invalidateStatsCache();

  if (adminEmail?.trim()) {
    const email = adminEmail.trim().toLowerCase();
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) {
      await db.insert(organizationMemberships).values({
        organizationId: newOrg.organizationId,
        userId: existingUser.userId,
        role: "owner",
        status: "active",
      }).onConflictDoNothing();
    }
  }

  await logEvent({
    level: "info",
    category: "org_management",
    message: `New organization created: "${name}"`,
    metadata: { orgId: newOrg.organizationId, name, adminEmail },
    orgId: newOrg.organizationId,
  });

  res.status(201).json(newOrg);
});

// ── PATCH /api/owner/orgs/:id ──────────────────────────────────────────────
router.patch("/owner/orgs/:id", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const orgId = parseInt(req.params.id, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid org ID" }); return; }

  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

  const [updated] = await db.update(organizations)
    .set({ name: name.trim() })
    .where(eq(organizations.organizationId, orgId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Org not found" }); return; }

  await logEvent({
    level: "info",
    category: "org_management",
    message: `Organization renamed to "${name}"`,
    metadata: { orgId },
    orgId,
  });

  res.json(updated);
});

// ── DELETE /api/owner/orgs/:id ─────────────────────────────────────────────
router.delete("/owner/orgs/:id", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const orgId = parseInt(req.params.id, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid org ID" }); return; }

  const [existing] = await db.select().from(organizations).where(eq(organizations.organizationId, orgId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Org not found" }); return; }

  await db.delete(organizations).where(eq(organizations.organizationId, orgId));
  invalidateStatsCache();

  await logEvent({
    level: "warn",
    category: "org_management",
    message: `Organization deleted: "${existing.name}" (ID: ${orgId})`,
    metadata: { orgId, name: existing.name },
    orgId,
  });

  res.status(204).send();
});

// ── GET /api/owner/logs ────────────────────────────────────────────────────
// Supports ?level=error&category=grading&orgId=3&limit=200
router.get("/owner/logs", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const level     = req.query.level    as string | undefined;
  const category  = req.query.category as string | undefined;
  const orgIdRaw  = req.query.orgId    as string | undefined;
  const orgId     = orgIdRaw ? parseInt(orgIdRaw, 10) : null;
  const limit     = Math.min(parseInt(req.query.limit as string ?? "200", 10), 500);

  // Build safe WHERE clauses (values are controlled/validated above)
  const conditions: string[] = ["1=1"];
  if (level && level !== "all")    conditions.push(`sl.level = '${level.replace(/'/g, "''")}'`);
  if (category && category !== "all") conditions.push(`sl.category = '${category.replace(/'/g, "''")}'`);
  if (orgId && !isNaN(orgId))     conditions.push(`sl.org_id = ${orgId}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const rows = await db.execute(sql.raw(`
    SELECT
      sl.log_id,
      sl.level,
      sl.category,
      sl.message,
      sl.metadata,
      sl.org_id,
      sl.user_id,
      sl.created_at,
      o.name AS org_name
    FROM system_logs sl
    LEFT JOIN organizations o ON o.organization_id = sl.org_id
    ${whereClause}
    ORDER BY sl.created_at DESC
    LIMIT ${limit}
  `));

  res.json(rows.rows);
});

// ── GET /api/owner/activity ────────────────────────────────────────────────
router.get("/owner/activity", requireLocalUser, requirePlatformOwner, async (_req, res): Promise<void> => {
  const [recentAttempts, recentUsers] = await Promise.all([
    db.execute(sql`
      SELECT
        a.attempt_id,
        a.attempt_state,
        a.submitted_at,
        u.name AS user_name,
        u.email AS user_email,
        m.title AS module_title,
        o.name AS org_name
      FROM attempts a
      JOIN users u ON u.user_id = a.user_id
      JOIN modules m ON m.module_id = a.module_id
      JOIN organizations o ON o.organization_id = a.organization_id
      ORDER BY a.submitted_at DESC NULLS LAST
      LIMIT 20
    `),
    db.select({
      userId: users.userId,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users)
      .orderBy(desc(users.createdAt))
      .limit(10),
  ]);

  res.json({ recentAttempts: recentAttempts.rows, recentUsers });
});

export default router;
