import { Router, type IRouter } from "express";
import { db, assignments, modules, users, organizationMemberships } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireLocalUser, isPlatformOwner } from "../middleware/auth";

const router: IRouter = Router();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

/**
 * GET /api/assignments/my
 * Returns the current learner's active assignments with module details.
 * Supports ?limit=N&offset=N
 */
router.get("/assignments/my", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const limit = Math.min(parseInt(req.query.limit as string || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

  const rows = await db
    .select({
      assignmentId: assignments.assignmentId,
      moduleId: assignments.moduleId,
      dueDate: assignments.dueDate,
      assignedAt: assignments.assignedAt,
      title: modules.title,
      category: modules.category,
      difficulty: modules.difficulty,
      description: modules.description,
      estimatedTime: modules.estimatedTime,
      status: modules.status,
      scenarioContext: modules.scenarioContext,
      scenarioTicket: modules.scenarioTicket,
    })
    .from(assignments)
    .innerJoin(modules, eq(modules.moduleId, assignments.moduleId))
    .where(
      and(
        eq(assignments.learnerId, localUser.userId),
        eq(assignments.isActive, true),
      )
    )
    .orderBy(asc(assignments.assignedAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/**
 * GET /api/assignments?orgId=1
 * Admin: list all assignments for org.
 * Supports ?limit=N&offset=N
 */
router.get("/assignments", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }

  // Platform owner bypasses membership check
  if (!isPlatformOwner(localUser)) {
    const [m] = await db.select({ role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, localUser.userId),
        eq(organizationMemberships.status, "active"),
      )).limit(1);

    if (!m || !["owner","admin","manager"].includes(m.role)) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
  }

  const limit = Math.min(parseInt(req.query.limit as string || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

  const rows = await db
    .select({
      assignmentId: assignments.assignmentId,
      moduleId: assignments.moduleId,
      learnerId: assignments.learnerId,
      dueDate: assignments.dueDate,
      assignedAt: assignments.assignedAt,
      isActive: assignments.isActive,
      moduleTitle: modules.title,
      learnerName: users.name,
      learnerEmail: users.email,
    })
    .from(assignments)
    .innerJoin(modules, eq(modules.moduleId, assignments.moduleId))
    .innerJoin(users, eq(users.userId, assignments.learnerId))
    .where(eq(assignments.organizationId, orgId))
    .orderBy(asc(assignments.assignedAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/**
 * POST /api/assignments
 * Admin: assign a module to a learner.
 */
router.post("/assignments", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { orgId, moduleId, learnerId, dueDate } = req.body;

  if (!orgId || !moduleId || !learnerId) {
    res.status(400).json({ error: "orgId, moduleId, learnerId required" }); return;
  }

  if (!isPlatformOwner(localUser)) {
    const [m] = await db.select({ role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, localUser.userId),
        eq(organizationMemberships.status, "active"),
      )).limit(1);

    if (!m || !["owner","admin","manager"].includes(m.role)) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
  }

  const [created] = await db.insert(assignments).values({
    organizationId: orgId,
    moduleId,
    learnerId,
    assignedBy: localUser.userId,
    dueDate: dueDate ?? null,
    isActive: true,
  }).returning();

  res.status(201).json(created);
});

/**
 * DELETE /api/assignments/:id
 * Admin: unassign (soft delete).
 */
router.delete("/assignments/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const assignmentId = parseInt(req.params.id, 10);
  if (isNaN(assignmentId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [a] = await db.select().from(assignments).where(eq(assignments.assignmentId, assignmentId)).limit(1);
  if (!a) { res.status(404).json({ error: "Not found" }); return; }

  if (!isPlatformOwner(localUser)) {
    const [m] = await db.select({ role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.organizationId, a.organizationId),
        eq(organizationMemberships.userId, localUser.userId),
        eq(organizationMemberships.status, "active"),
      )).limit(1);

    if (!m || !["owner","admin","manager"].includes(m.role)) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
  }

  await db.update(assignments).set({ isActive: false }).where(eq(assignments.assignmentId, assignmentId));
  res.status(204).send();
});

export default router;
