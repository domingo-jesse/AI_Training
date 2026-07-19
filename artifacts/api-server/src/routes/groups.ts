import { Router, type IRouter } from "express";
import { db, groups, userGroups, users, organizationMemberships } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireLocalUser } from "../middleware/auth";

const router: IRouter = Router();

/** Verify requester has admin/manager role in org. Returns null if ok, sends error if not. */
async function checkAdmin(res: any, orgId: number, userId: number): Promise<boolean> {
  const [m] = await db.select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.status, "active"),
    )).limit(1);
  if (!m || !["owner", "admin", "manager"].includes(m.role)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

/**
 * GET /api/groups?orgId=N
 * List all groups for an org, with member count.
 */
router.get("/groups", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }
  if (!await checkAdmin(res, orgId, localUser.userId)) return;

  const orgGroups = await db.select().from(groups).where(eq(groups.orgId, orgId));
  if (orgGroups.length === 0) { res.json([]); return; }

  const groupIds = orgGroups.map(g => g.groupId);
  const members = await db
    .select({ groupId: userGroups.groupId, userId: userGroups.userId, userName: users.name, userEmail: users.email })
    .from(userGroups)
    .innerJoin(users, eq(users.userId, userGroups.userId))
    .where(inArray(userGroups.groupId, groupIds));

  const membersByGroup = members.reduce<Record<number, typeof members>>((acc, m) => {
    if (!acc[m.groupId]) acc[m.groupId] = [];
    acc[m.groupId].push(m);
    return acc;
  }, {});

  res.json(orgGroups.map(g => ({
    ...g,
    memberCount: (membersByGroup[g.groupId] ?? []).length,
    members: membersByGroup[g.groupId] ?? [],
  })));
});

/**
 * POST /api/groups
 * Create a new group.
 */
router.post("/groups", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { orgId, name, color } = req.body;
  if (!orgId || !name) { res.status(400).json({ error: "orgId and name required" }); return; }
  if (!await checkAdmin(res, orgId, localUser.userId)) return;

  const [created] = await db.insert(groups).values({
    orgId,
    name: name.trim(),
    color: color ?? "#6366f1",
  }).returning();

  res.status(201).json({ ...created, memberCount: 0, members: [] });
});

/**
 * PATCH /api/groups/:id
 * Update group name/color.
 */
router.patch("/groups/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [g] = await db.select().from(groups).where(eq(groups.groupId, groupId)).limit(1);
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  if (!await checkAdmin(res, g.orgId, localUser.userId)) return;

  const updates: Partial<typeof g> = {};
  if (req.body.name) updates.name = req.body.name.trim();
  if (req.body.color) updates.color = req.body.color;

  const [updated] = await db.update(groups).set(updates).where(eq(groups.groupId, groupId)).returning();
  res.json(updated);
});

/**
 * DELETE /api/groups/:id
 * Delete a group (cascades user_groups).
 */
router.delete("/groups/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [g] = await db.select().from(groups).where(eq(groups.groupId, groupId)).limit(1);
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  if (!await checkAdmin(res, g.orgId, localUser.userId)) return;

  await db.delete(groups).where(eq(groups.groupId, groupId));
  res.status(204).send();
});

/**
 * POST /api/groups/:id/members
 * Add a user to a group. Body: { userId }
 */
router.post("/groups/:id/members", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const groupId = parseInt(req.params.id, 10);
  const { userId } = req.body;
  if (isNaN(groupId) || !userId) { res.status(400).json({ error: "groupId and userId required" }); return; }

  const [g] = await db.select().from(groups).where(eq(groups.groupId, groupId)).limit(1);
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  if (!await checkAdmin(res, g.orgId, localUser.userId)) return;

  await db.insert(userGroups).values({ groupId, userId }).onConflictDoNothing();
  res.status(201).json({ ok: true });
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove a user from a group.
 */
router.delete("/groups/:id/members/:userId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const groupId = parseInt(req.params.id, 10);
  const targetUserId = parseInt(req.params.userId, 10);
  if (isNaN(groupId) || isNaN(targetUserId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [g] = await db.select().from(groups).where(eq(groups.groupId, groupId)).limit(1);
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  if (!await checkAdmin(res, g.orgId, localUser.userId)) return;

  await db.delete(userGroups).where(and(
    eq(userGroups.groupId, groupId),
    eq(userGroups.userId, targetUserId),
  ));
  res.status(204).send();
});

export default router;
