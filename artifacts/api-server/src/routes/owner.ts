import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { organizations, users, modules, attempts, organizationMemberships } from "@workspace/db";
import { eq, sql, desc, count, and } from "drizzle-orm";
import { requireLocalUser } from "../middleware/auth";
import { clerkClient } from "@clerk/express";

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

// Helper to write a system log entry
export async function logEvent(opts: {
  level?: "info" | "warn" | "error";
  category?: string;
  message: string;
  metadata?: Record<string, unknown>;
  orgId?: number;
  userId?: string;
}) {
  try {
    await db.execute(sql`
      INSERT INTO system_logs (level, category, message, metadata, org_id, user_id)
      VALUES (
        ${opts.level ?? "info"},
        ${opts.category ?? "general"},
        ${opts.message},
        ${opts.metadata ? JSON.stringify(opts.metadata) : null}::jsonb,
        ${opts.orgId ?? null},
        ${opts.userId ?? null}
      )
    `);
  } catch {
    // Never let logging crash the app
  }
}

// ── GET /api/owner/check ───────────────────────────────────────────────────
router.get("/owner/check", requireLocalUser, requirePlatformOwner, (_req, res) => {
  res.json({ ok: true });
});

// ── GET /api/owner/stats ───────────────────────────────────────────────────
router.get("/owner/stats", requireLocalUser, requirePlatformOwner, async (_req, res): Promise<void> => {
  const [orgCount] = await db.select({ count: count() }).from(organizations);
  const [userCount] = await db.select({ count: count() }).from(users);
  const [moduleCount] = await db.select({ count: count() }).from(modules);
  const [attemptCount] = await db.select({ count: count() }).from(attempts);

  // Attempts submitted today
  const [todayAttempts] = await db.select({ count: count() }).from(attempts)
    .where(sql`submitted_at >= NOW() - INTERVAL '24 hours'`);

  // Error count last 24h
  const errorCountResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM system_logs WHERE level = 'error' AND created_at >= NOW() - INTERVAL '24 hours'
  `);
  const errorCount = Number((errorCountResult.rows[0] as any)?.count ?? 0);

  res.json({
    orgs: Number(orgCount.count),
    users: Number(userCount.count),
    modules: Number(moduleCount.count),
    attempts: Number(attemptCount.count),
    attemptsToday: Number(todayAttempts.count),
    errorsToday: errorCount,
  });
});

// ── GET /api/owner/orgs ────────────────────────────────────────────────────
router.get("/owner/orgs", requireLocalUser, requirePlatformOwner, async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      o.organization_id,
      o.name,
      COUNT(DISTINCT om.user_id) FILTER (WHERE om.status = 'active') AS member_count,
      COUNT(DISTINCT m.module_id) AS module_count,
      COUNT(DISTINCT a.attempt_id) AS attempt_count,
      COUNT(DISTINCT asgn.assignment_id) AS assignment_count
    FROM organizations o
    LEFT JOIN organization_memberships om ON om.organization_id = o.organization_id
    LEFT JOIN modules m ON m.organization_id = o.organization_id
    LEFT JOIN attempts a ON a.organization_id = o.organization_id
    LEFT JOIN assignments asgn ON asgn.organization_id = o.organization_id
    GROUP BY o.organization_id, o.name
    ORDER BY o.organization_id ASC
  `);

  res.json(rows.rows);
});

// ── GET /api/owner/orgs/:id ────────────────────────────────────────────────
router.get("/owner/orgs/:id", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const orgId = parseInt(req.params.id, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid org ID" }); return; }

  const [org] = await db.select().from(organizations).where(eq(organizations.organizationId, orgId)).limit(1);
  if (!org) { res.status(404).json({ error: "Org not found" }); return; }

  const members = await db.select({
    userId: users.userId,
    name: users.name,
    email: users.email,
    role: organizationMemberships.role,
    status: organizationMemberships.status,
    createdAt: users.createdAt,
  }).from(organizationMemberships)
    .innerJoin(users, eq(users.userId, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, orgId));

  const moduleRows = await db.select({
    moduleId: modules.moduleId,
    title: modules.title,
    status: modules.status,
    difficulty: modules.difficulty,
  }).from(modules).where(eq(modules.organizationId, orgId));

  res.json({ org, members, modules: moduleRows });
});

// ── POST /api/owner/orgs ───────────────────────────────────────────────────
router.post("/owner/orgs", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const { name, adminEmail } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Organization name is required" }); return; }

  // Create the org
  const [newOrg] = await db.insert(organizations).values({ name: name.trim() }).returning();

  // If an admin email is provided, find or look up the user and add them as owner
  if (adminEmail?.trim()) {
    const email = adminEmail.trim().toLowerCase();
    const [existingUser] = await db.select().from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      // Add them to the org as owner
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

  await logEvent({
    level: "warn",
    category: "org_management",
    message: `Organization deleted: "${existing.name}" (ID: ${orgId})`,
    metadata: { orgId, name: existing.name },
  });

  res.status(204).send();
});

// ── GET /api/owner/logs ────────────────────────────────────────────────────
router.get("/owner/logs", requireLocalUser, requirePlatformOwner, async (req, res): Promise<void> => {
  const level = req.query.level as string | undefined;
  const category = req.query.category as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string ?? "100", 10), 500);

  let whereClause = "WHERE 1=1";
  if (level && level !== "all") whereClause += ` AND level = '${level.replace(/'/g, "''")}'`;
  if (category && category !== "all") whereClause += ` AND category = '${category.replace(/'/g, "''")}'`;

  const rows = await db.execute(sql.raw(`
    SELECT log_id, level, category, message, metadata, org_id, user_id, created_at
    FROM system_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `));

  res.json(rows.rows);
});

// ── GET /api/owner/activity ────────────────────────────────────────────────
// Recent platform-wide activity (attempts, new users, new orgs)
router.get("/owner/activity", requireLocalUser, requirePlatformOwner, async (_req, res): Promise<void> => {
  const recentAttempts = await db.execute(sql`
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
  `);

  const recentUsers = await db.select({
    userId: users.userId,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users)
    .orderBy(desc(users.createdAt))
    .limit(10);

  res.json({
    recentAttempts: recentAttempts.rows,
    recentUsers,
  });
});

export default router;
