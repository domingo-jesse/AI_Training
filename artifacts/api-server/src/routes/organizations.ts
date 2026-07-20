import { Router, type IRouter } from "express";
import { db, organizationMemberships, organizations, users as usersTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireLocalUser, isPlatformOwner } from "../middleware/auth";

const router: IRouter = Router();

const ADMIN_ROLES = ["owner", "admin", "manager"];

/**
 * GET /api/organizations
 * Returns the current user's organization memberships with org details.
 */
router.get("/organizations", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;

  const memberships = await db
    .select({
      membershipId: organizationMemberships.id,
      organizationId: organizationMemberships.organizationId,
      organizationName: organizations.name,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      createdAt: organizationMemberships.createdAt,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.organizationId, organizationMemberships.organizationId))
    .where(
      and(
        eq(organizationMemberships.userId, localUser.userId),
        eq(organizationMemberships.status, "active"),
      )
    );

  res.json(memberships);
});

/**
 * GET /api/organizations/:orgId/members
 * Returns all members of an organization. Requires admin/owner/manager role.
 */
router.get("/organizations/:orgId/members", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.params.orgId, 10);

  if (isNaN(orgId)) {
    res.status(400).json({ error: "Invalid organization ID" });
    return;
  }

  // Platform owner can view any org's members without a membership
  if (!isPlatformOwner(localUser)) {
    const [requesterMembership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, orgId),
          eq(organizationMemberships.userId, localUser.userId),
          eq(organizationMemberships.status, "active"),
        )
      )
      .limit(1);

    if (!requesterMembership) {
      res.status(403).json({ error: "You are not a member of this organization" });
      return;
    }

    if (!ADMIN_ROLES.includes(requesterMembership.role)) {
      res.status(403).json({ error: "Insufficient role to view members" });
      return;
    }
  }

  // Fetch all members — filter out platform owner emails so they stay hidden
  const ownerEmails = (process.env.PLATFORM_OWNER_EMAILS ?? "domingo.jesse@gmail.com")
    .split(",").map(e => e.trim().toLowerCase());

  const members = await db
    .select({
      membershipId: organizationMemberships.id,
      userId: organizationMemberships.userId,
      name: usersTable.name,
      email: usersTable.email,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      joinedAt: organizationMemberships.createdAt,
      isActive: usersTable.isActive,
    })
    .from(organizationMemberships)
    .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, orgId))
    .orderBy(organizationMemberships.createdAt);

  res.json(members.filter(m => !ownerEmails.includes(m.email?.toLowerCase() ?? "")));
});

/**
 * POST /api/organizations/:orgId/members
 * Add a user to the org by email. Requires admin/owner/manager.
 */
router.post("/organizations/:orgId/members", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.params.orgId, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid org ID" }); return; }

  const [requester] = await db.select().from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, localUser.userId),
      eq(organizationMemberships.status, "active"),
    )).limit(1);

  if (!requester || !ADMIN_ROLES.includes(requester.role)) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  const { email, role } = req.body;
  if (!email) { res.status(400).json({ error: "email is required" }); return; }
  const memberRole = role ?? "learner";

  // Find user by email
  const [targetUser] = await db.select().from(usersTable)
    .where(ilike(usersTable.email, email.trim()))
    .limit(1);

  if (!targetUser) {
    res.status(404).json({ error: "No account found with that email. The user must sign in at least once before being added." });
    return;
  }

  // Check for existing membership
  const [existing] = await db.select().from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, targetUser.userId),
    )).limit(1);

  if (existing) {
    if (existing.status === "active") {
      res.status(409).json({ error: "User is already a member of this organization" }); return;
    }
    // Reactivate
    const [updated] = await db.update(organizationMemberships)
      .set({ status: "active", role: memberRole })
      .where(eq(organizationMemberships.id, existing.id))
      .returning();
    const member = await db.select({
      membershipId: organizationMemberships.id,
      userId: organizationMemberships.userId,
      name: usersTable.name,
      email: usersTable.email,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      joinedAt: organizationMemberships.createdAt,
      isActive: usersTable.isActive,
    }).from(organizationMemberships)
      .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
      .where(eq(organizationMemberships.id, updated.id)).limit(1);
    res.status(201).json(member[0]); return;
  }

  // Create new membership
  const [created] = await db.insert(organizationMemberships).values({
    organizationId: orgId,
    userId: targetUser.userId,
    role: memberRole,
    status: "active",
  }).returning();

  const [member] = await db.select({
    membershipId: organizationMemberships.id,
    userId: organizationMemberships.userId,
    name: usersTable.name,
    email: usersTable.email,
    role: organizationMemberships.role,
    status: organizationMemberships.status,
    joinedAt: organizationMemberships.createdAt,
    isActive: usersTable.isActive,
  }).from(organizationMemberships)
    .innerJoin(usersTable, eq(usersTable.userId, organizationMemberships.userId))
    .where(eq(organizationMemberships.id, created.id)).limit(1);

  // Also update the user's global role to match
  await db.update(usersTable)
    .set({ role: memberRole === "learner" ? "learner" : "admin" })
    .where(eq(usersTable.userId, targetUser.userId));

  res.status(201).json(member);
});

/**
 * PUT /api/organizations/:orgId/members/:userId
 * Update a member's role. Requires admin/owner/manager.
 */
router.put("/organizations/:orgId/members/:userId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.params.orgId, 10);
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(orgId) || isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [requester] = await db.select().from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, localUser.userId),
      eq(organizationMemberships.status, "active"),
    )).limit(1);

  if (!requester || !ADMIN_ROLES.includes(requester.role)) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  const { role } = req.body;
  if (!role) { res.status(400).json({ error: "role is required" }); return; }

  await db.update(organizationMemberships)
    .set({ role })
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, userId),
    ));

  // Sync global users.role
  await db.update(usersTable)
    .set({ role: role === "learner" ? "learner" : "admin" })
    .where(eq(usersTable.userId, userId));

  res.json({ ok: true });
});

/**
 * DELETE /api/organizations/:orgId/members/:userId
 * Remove (deactivate) a member. Requires admin/owner/manager.
 */
router.delete("/organizations/:orgId/members/:userId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.params.orgId, 10);
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(orgId) || isNaN(userId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  if (userId === localUser.userId) {
    res.status(400).json({ error: "You cannot remove yourself" }); return;
  }

  const [requester] = await db.select().from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, localUser.userId),
      eq(organizationMemberships.status, "active"),
    )).limit(1);

  if (!requester || !ADMIN_ROLES.includes(requester.role)) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  await db.update(organizationMemberships)
    .set({ status: "inactive" })
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, userId),
    ));

  res.status(204).send();
});

export default router;
