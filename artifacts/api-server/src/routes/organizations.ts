import { Router, type IRouter } from "express";
import { db, organizationMemberships, organizations, users as usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireLocalUser } from "../middleware/auth";

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

  // Verify requester is a member with sufficient role
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

  // Fetch all members with user profile data
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

  res.json(members);
});

export default router;
