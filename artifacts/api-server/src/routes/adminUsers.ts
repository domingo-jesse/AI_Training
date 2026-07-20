import { Router, type IRouter } from "express";
import { db, users as usersTable, organizationMemberships } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireLocalUser, isPlatformOwner } from "../middleware/auth";

const router: IRouter = Router();
const ADMIN_ROLES = ["owner", "admin", "manager"];

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

/**
 * GET /api/admin/users?orgId=1
 * List all users in the org (from org memberships + users table).
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
 * Create a new user + add them to the org.
 */
router.post("/admin/users", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { orgId, name, email, role } = req.body;
  if (!orgId || !name || !email) {
    res.status(400).json({ error: "orgId, name, email required" }); return;
  }
  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  // Check duplicate email
  const [existing] = await db.select().from(usersTable)
    .where(ilike(usersTable.email, email.trim())).limit(1);

  if (existing) {
    // User already exists — just add to org if not already a member
    const [mem] = await db.select().from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, existing.userId),
      )).limit(1);

    if (mem) {
      // Reactivate and update role
      await db.update(organizationMemberships)
        .set({ status: "active", role: role ?? "learner" })
        .where(eq(organizationMemberships.id, mem.id));
    } else {
      await db.insert(organizationMemberships).values({
        organizationId: orgId,
        userId: existing.userId,
        role: role ?? "learner",
        status: "active",
      });
    }
    // Also update role on user record
    await db.update(usersTable)
      .set({ role: role === "learner" ? "learner" : "admin", isActive: true })
      .where(eq(usersTable.userId, existing.userId));

    const [fresh] = await db.select({
      userId: usersTable.userId, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      authProvider: usersTable.authProvider,
      membershipId: organizationMemberships.id,
      membershipRole: organizationMemberships.role, membershipStatus: organizationMemberships.status,
    }).from(organizationMemberships)
      .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, existing.userId),
      )).limit(1);
    res.status(201).json(fresh);
    return;
  }

  // Create new user with pending Clerk ID (will be linked on first sign-in via email match)
  const pendingId = `pending_${Date.now()}_${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const [newUser] = await db.insert(usersTable).values({
    id: pendingId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role === "learner" ? "learner" : "admin",
    organizationId: orgId,
    authProvider: "pending",
    isActive: true,
  }).returning();

  // Add to org
  const [membership] = await db.insert(organizationMemberships).values({
    organizationId: orgId,
    userId: newUser.userId,
    role: role ?? "learner",
    status: "active",
  }).returning();

  res.status(201).json({
    userId: newUser.userId, name: newUser.name, email: newUser.email,
    role: newUser.role, isActive: newUser.isActive, createdAt: newUser.createdAt,
    authProvider: newUser.authProvider,
    membershipId: membership.id,
    membershipRole: membership.role, membershipStatus: membership.status,
  });
});

/**
 * PATCH /api/admin/users/:userId
 * Update name, email, role, or isActive for a user in the org.
 */
router.patch("/admin/users/:userId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const userId = parseInt(req.params.userId, 10);
  const { orgId, name, email, role, isActive } = req.body;
  if (isNaN(userId) || !orgId) { res.status(400).json({ error: "userId and orgId required" }); return; }
  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role === "learner" ? "learner" : "admin";
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.userId, userId));
  }

  // Sync org membership role
  if (role !== undefined) {
    await db.update(organizationMemberships)
      .set({ role })
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, userId),
      ));
  }

  // If deactivating, also set membership inactive
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

  const [fresh] = await db.select({
    userId: usersTable.userId, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt,
    authProvider: usersTable.authProvider,
    membershipId: organizationMemberships.id,
    membershipRole: organizationMemberships.role, membershipStatus: organizationMemberships.status,
  }).from(organizationMemberships)
    .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, userId),
    )).limit(1);

  res.json(fresh);
});

export default router;
