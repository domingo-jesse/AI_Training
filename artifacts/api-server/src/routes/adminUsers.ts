import { Router, type IRouter } from "express";
import { db, users as usersTable, organizationMemberships } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireLocalUser, isPlatformOwner, invalidateUserCache } from "../middleware/auth";
import { logEvent } from "../services/logEvent";

const router: IRouter = Router();
const ADMIN_ROLES = ["owner", "admin", "manager"];
const VALID_ROLES = ["learner", "manager", "admin", "owner"] as const;

async function assertOrgAdmin(localUser: any, orgId: number, res: any): Promise<boolean> {
  if (isPlatformOwner(localUser)) return true;

  const [m] = await db.select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, localUser.userId),
      eq(organizationMemberships.status, "active"),
    )).limit(1);
  if (!m || !ADMIN_ROLES.includes(m.role)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

/** Upsert a single user into an org — used by both single-add and bulk import. */
async function upsertUserInOrg(opts: {
  orgId: number;
  name: string;
  email: string;
  role: string;
}): Promise<{ userId: number; status: "created" | "existing" }> {
  const { orgId, name, email, role } = opts;
  const safeRole = VALID_ROLES.includes(role as any) ? role : "learner";
  const cleanEmail = email.trim().toLowerCase();

  // Check if user already exists
  const [existing] = await db.select()
    .from(usersTable)
    .where(ilike(usersTable.email, cleanEmail))
    .limit(1);

  let userId: number;
  let status: "created" | "existing";

  if (existing) {
    userId = existing.userId;
    status = "existing";

    // Update role / reactivate
    await db.update(usersTable)
      .set({ role: safeRole === "learner" ? "learner" : "admin", isActive: true })
      .where(eq(usersTable.userId, userId));
    invalidateUserCache(existing.id);

    // Upsert membership
    const [mem] = await db.select().from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
      )).limit(1);

    if (mem) {
      await db.update(organizationMemberships)
        .set({ status: "active", role: safeRole })
        .where(eq(organizationMemberships.id, mem.id));
    } else {
      await db.insert(organizationMemberships).values({
        organizationId: orgId,
        userId,
        role: safeRole,
        status: "active",
      });
    }
  } else {
    // Create pending user (will be linked on first Clerk sign-in via email match)
    const pendingId = `pending_${Date.now()}_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
    const [newUser] = await db.insert(usersTable).values({
      id: pendingId,
      name: name.trim() || cleanEmail.split("@")[0],
      email: cleanEmail,
      role: safeRole === "learner" ? "learner" : "admin",
      organizationId: orgId,
      authProvider: "pending",
      isActive: true,
    }).returning();
    userId = newUser.userId;
    status = "created";

    await db.insert(organizationMemberships).values({
      organizationId: orgId,
      userId,
      role: safeRole,
      status: "active",
    });
  }

  return { userId, status };
}

/**
 * GET /api/admin/users?orgId=1
 * List all users in the org.
 */
router.get("/admin/users", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }
  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  const rows = await db
    .select({
      userId: usersTable.userId,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      authProvider: usersTable.authProvider,
      membershipId: organizationMemberships.id,
      membershipRole: organizationMemberships.role,
      membershipStatus: organizationMemberships.status,
    })
    .from(organizationMemberships)
    .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, orgId))
    .orderBy(usersTable.createdAt);

  res.json(rows);
});

/**
 * POST /api/admin/users
 * Create/add a single user to the org.
 */
router.post("/admin/users", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { orgId, name, email, role } = req.body;
  if (!orgId || !name || !email) {
    res.status(400).json({ error: "orgId, name, email required" }); return;
  }
  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  try {
    const { userId, status } = await upsertUserInOrg({ orgId, name, email, role: role ?? "learner" });

    // Return full row with membership info
    const [fresh] = await db.select({
      userId: usersTable.userId, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      authProvider: usersTable.authProvider,
      membershipId: organizationMemberships.id,
      membershipRole: organizationMemberships.role,
      membershipStatus: organizationMemberships.status,
    }).from(organizationMemberships)
      .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
      )).limit(1);

    res.status(status === "created" ? 201 : 200).json(fresh);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to add user" });
  }
});

/**
 * POST /api/admin/users/bulk
 * Bulk-create/add users from a CSV or JSON array. Max 500 rows per call.
 * Body: { orgId: number, users: Array<{ name: string, email: string, role?: string }> }
 * Returns: { results, created, existing, errors }
 */
router.post("/admin/users/bulk", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { orgId, users } = req.body;

  if (!orgId || !Array.isArray(users) || users.length === 0) {
    res.status(400).json({ error: "orgId and a non-empty users array are required" }); return;
  }
  if (users.length > 500) {
    res.status(400).json({ error: "Maximum 500 users per bulk import" }); return;
  }
  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  // Validate basic shape
  const invalid = users.find(u => !u.email?.includes("@"));
  if (invalid) {
    res.status(400).json({ error: `Invalid email: "${invalid.email}"` }); return;
  }

  const results = await Promise.allSettled(
    users.map(async (u: { name?: string; email: string; role?: string }) => {
      const { status } = await upsertUserInOrg({
        orgId,
        name: u.name ?? u.email.split("@")[0],
        email: u.email,
        role: u.role ?? "learner",
      });
      return { email: u.email, name: u.name ?? "", status };
    })
  );

  const rows = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { email: users[i].email, name: users[i].name ?? "", status: "error" as const, error: (r.reason as Error)?.message ?? "Unknown error" }
  );

  const created  = rows.filter(r => r.status === "created").length;
  const existing = rows.filter(r => r.status === "existing").length;
  const errors   = rows.filter(r => r.status === "error").length;

  await logEvent({
    level: errors === rows.length ? "error" : errors > 0 ? "warn" : "info",
    category: "org_management",
    message: `Bulk import: ${created} created, ${existing} existing, ${errors} failed`,
    metadata: { orgId, total: rows.length, created, existing, errors },
    orgId,
    userId: localUser.userId,
  });

  res.json({ results: rows, created, existing, errors });
});

/**
 * PATCH /api/admin/users/:userId
 * Update name, email, role, or isActive.
 */
router.patch("/admin/users/:userId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const userId = parseInt(req.params.userId, 10);
  const { orgId, name, email, role, isActive } = req.body;
  if (isNaN(userId) || !orgId) { res.status(400).json({ error: "userId and orgId required" }); return; }
  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  const updates: Record<string, any> = {};
  if (name !== undefined)     updates.name = name;
  if (email !== undefined)    updates.email = email;
  if (role !== undefined)     updates.role = role === "learner" ? "learner" : "admin";
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.userId, userId));
  }

  if (role !== undefined) {
    await db.update(organizationMemberships)
      .set({ role })
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
      ));
  }

  if (isActive === false) {
    await db.update(organizationMemberships)
      .set({ status: "inactive" })
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
      ));
  } else if (isActive === true) {
    await db.update(organizationMemberships)
      .set({ status: "active" })
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
      ));
  }

  // Invalidate user cache on role/status changes
  const [userRecord] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.userId, userId)).limit(1);
  if (userRecord) invalidateUserCache(userRecord.id);

  const [fresh] = await db.select({
    userId: usersTable.userId, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt,
    authProvider: usersTable.authProvider,
    membershipId: organizationMemberships.id,
    membershipRole: organizationMemberships.role,
    membershipStatus: organizationMemberships.status,
  }).from(organizationMemberships)
    .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, userId),
    )).limit(1);

  res.json(fresh);
});

export default router;
