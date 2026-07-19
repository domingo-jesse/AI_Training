import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { modules, moduleQuestions, organizationMemberships, assignments } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireLocalUser } from "../middleware/auth";
import { generateModuleWithLLM } from "../services/llmModuleGeneratorService";

const router: IRouter = Router();

const ADMIN_ROLES = ["owner", "admin", "manager"];

async function assertOrgAdmin(localUser: any, orgId: number, res: any): Promise<boolean> {
  const [m] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.userId, localUser.userId),
        eq(organizationMemberships.status, "active"),
      )
    )
    .limit(1);

  if (!m || !ADMIN_ROLES.includes(m.role)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

/** GET /api/modules?orgId=1 */
router.get("/modules", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);

  if (isNaN(orgId)) {
    res.status(400).json({ error: "orgId query param required" });
    return;
  }

  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  const rows = await db
    .select({
      moduleId: modules.moduleId,
      title: modules.title,
      category: modules.category,
      difficulty: modules.difficulty,
      description: modules.description,
      estimatedTime: modules.estimatedTime,
      status: modules.status,
      scoringStyle: modules.scoringStyle,
      llmScoringEnabled: modules.llmScoringEnabled,
      createdAt: modules.createdAt,
      updatedAt: modules.updatedAt,
    })
    .from(modules)
    .where(eq(modules.organizationId, orgId))
    .orderBy(asc(modules.createdAt));

  res.json(rows);
});

/** GET /api/modules/:id */
router.get("/modules/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = parseInt(req.params.id, 10);

  if (isNaN(moduleId)) {
    res.status(400).json({ error: "Invalid module ID" });
    return;
  }

  const [mod] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }

  // Admins can always access; learners can access if they have an active assignment for this module
  const isAdmin = mod.organizationId
    ? await assertOrgAdmin(localUser, mod.organizationId, { status: () => ({ json: () => {} }) } as any)
    : false;

  if (!isAdmin) {
    const [assignment] = await db
      .select({ assignmentId: assignments.assignmentId })
      .from(assignments)
      .where(and(
        eq(assignments.moduleId, moduleId),
        eq(assignments.learnerId, localUser.userId),
        eq(assignments.isActive, true),
      ))
      .limit(1);

    if (!assignment) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const questions = await db
    .select()
    .from(moduleQuestions)
    .where(eq(moduleQuestions.moduleId, moduleId))
    .orderBy(asc(moduleQuestions.questionOrder));

  res.json({ ...mod, questions });
});

/** POST /api/modules */
router.post("/modules", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { orgId, title, category, difficulty, description, estimatedTime, status,
          scenarioTicket, scenarioContext, hiddenRootCause, expectedDiagnosis,
          expectedReasoningPath, expectedNextSteps, expectedCustomerResponse,
          lessonTakeaway, learningObjectives, scoringStyle, llmScoringEnabled,
          llmGraderInstructions, learnerFeedbackVisibility } = req.body;

  if (!orgId || !title || !category || !difficulty) {
    res.status(400).json({ error: "orgId, title, category, difficulty required" });
    return;
  }

  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  const [created] = await db
    .insert(modules)
    .values({
      organizationId: orgId,
      title,
      category,
      difficulty,
      description: description ?? null,
      estimatedTime: estimatedTime ?? null,
      status: status ?? "published",
      scenarioTicket: scenarioTicket ?? null,
      scenarioContext: scenarioContext ?? null,
      hiddenRootCause: hiddenRootCause ?? null,
      expectedDiagnosis: expectedDiagnosis ?? null,
      expectedReasoningPath: expectedReasoningPath ?? null,
      expectedNextSteps: expectedNextSteps ?? null,
      expectedCustomerResponse: expectedCustomerResponse ?? null,
      lessonTakeaway: lessonTakeaway ?? null,
      learningObjectives: learningObjectives ?? null,
      scoringStyle: scoringStyle ?? "manual",
      llmScoringEnabled: llmScoringEnabled ?? false,
      llmGraderInstructions: llmGraderInstructions ?? null,
      learnerFeedbackVisibility: learnerFeedbackVisibility ?? "admin_approved_only",
      createdBy: localUser.userId,
    })
    .returning();

  res.status(201).json(created);
});

/** PUT /api/modules/:id */
router.put("/modules/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = parseInt(req.params.id, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module ID" }); return; }

  const [existing] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Module not found" }); return; }
  if (existing.organizationId && !(await assertOrgAdmin(localUser, existing.organizationId, res))) return;

  const { title, category, difficulty, description, estimatedTime, status,
          scenarioTicket, scenarioContext, hiddenRootCause, expectedDiagnosis,
          expectedReasoningPath, expectedNextSteps, expectedCustomerResponse,
          lessonTakeaway, learningObjectives, scoringStyle, llmScoringEnabled,
          llmGraderInstructions, learnerFeedbackVisibility } = req.body;

  const [updated] = await db
    .update(modules)
    .set({
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(difficulty !== undefined && { difficulty }),
      ...(description !== undefined && { description }),
      ...(estimatedTime !== undefined && { estimatedTime }),
      ...(status !== undefined && { status }),
      ...(scenarioTicket !== undefined && { scenarioTicket }),
      ...(scenarioContext !== undefined && { scenarioContext }),
      ...(hiddenRootCause !== undefined && { hiddenRootCause }),
      ...(expectedDiagnosis !== undefined && { expectedDiagnosis }),
      ...(expectedReasoningPath !== undefined && { expectedReasoningPath }),
      ...(expectedNextSteps !== undefined && { expectedNextSteps }),
      ...(expectedCustomerResponse !== undefined && { expectedCustomerResponse }),
      ...(lessonTakeaway !== undefined && { lessonTakeaway }),
      ...(learningObjectives !== undefined && { learningObjectives }),
      ...(scoringStyle !== undefined && { scoringStyle }),
      ...(llmScoringEnabled !== undefined && { llmScoringEnabled }),
      ...(llmGraderInstructions !== undefined && { llmGraderInstructions }),
      ...(learnerFeedbackVisibility !== undefined && { learnerFeedbackVisibility }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(modules.moduleId, moduleId))
    .returning();

  res.json(updated);
});

/** DELETE /api/modules/:id */
router.delete("/modules/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = parseInt(req.params.id, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module ID" }); return; }

  const [existing] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Module not found" }); return; }
  if (existing.organizationId && !(await assertOrgAdmin(localUser, existing.organizationId, res))) return;

  await db.delete(moduleQuestions).where(eq(moduleQuestions.moduleId, moduleId));
  await db.delete(modules).where(eq(modules.moduleId, moduleId));

  res.status(204).send();
});

// ── Questions ──────────────────────────────────────────────────────────────────

/** POST /api/modules/:id/questions */
router.post("/modules/:id/questions", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = parseInt(req.params.id, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module ID" }); return; }

  const [mod] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }
  if (mod.organizationId && !(await assertOrgAdmin(localUser, mod.organizationId, res))) return;

  const { questionText, expectedAnswer, maxPoints, questionType, rubric,
          aiConversationPrompt, aiRoleOrPersona, evaluationFocus,
          maxLearnerResponses, optionalWrapUpInstruction } = req.body;

  if (!questionText) { res.status(400).json({ error: "questionText required" }); return; }

  // auto-assign order
  const existing = await db.select({ questionOrder: moduleQuestions.questionOrder })
    .from(moduleQuestions).where(eq(moduleQuestions.moduleId, moduleId));
  const nextOrder = existing.length > 0 ? Math.max(...existing.map(q => q.questionOrder)) + 1 : 1;

  const [created] = await db
    .insert(moduleQuestions)
    .values({
      moduleId,
      questionOrder: nextOrder,
      questionText,
      expectedAnswer: expectedAnswer ?? null,
      maxPoints: maxPoints ?? 10,
      questionType: questionType ?? "open_text",
      rubric: rubric ?? null,
      aiConversationPrompt: aiConversationPrompt ?? null,
      aiRoleOrPersona: aiRoleOrPersona ?? null,
      evaluationFocus: evaluationFocus ?? null,
      maxLearnerResponses: maxLearnerResponses ?? 3,
      optionalWrapUpInstruction: optionalWrapUpInstruction ?? null,
    })
    .returning();

  res.status(201).json(created);
});

/** PUT /api/modules/:id/questions/:qId */
router.put("/modules/:id/questions/:qId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = parseInt(req.params.id, 10);
  const qId = parseInt(req.params.qId, 10);
  if (isNaN(moduleId) || isNaN(qId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [mod] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }
  if (mod.organizationId && !(await assertOrgAdmin(localUser, mod.organizationId, res))) return;

  const { questionText, expectedAnswer, maxPoints, questionType, rubric,
          questionOrder, aiConversationPrompt, aiRoleOrPersona, evaluationFocus,
          maxLearnerResponses, optionalWrapUpInstruction } = req.body;

  const [updated] = await db
    .update(moduleQuestions)
    .set({
      ...(questionText !== undefined && { questionText }),
      ...(expectedAnswer !== undefined && { expectedAnswer }),
      ...(maxPoints !== undefined && { maxPoints }),
      ...(questionType !== undefined && { questionType }),
      ...(rubric !== undefined && { rubric }),
      ...(questionOrder !== undefined && { questionOrder }),
      ...(aiConversationPrompt !== undefined && { aiConversationPrompt }),
      ...(aiRoleOrPersona !== undefined && { aiRoleOrPersona }),
      ...(evaluationFocus !== undefined && { evaluationFocus }),
      ...(maxLearnerResponses !== undefined && { maxLearnerResponses }),
      ...(optionalWrapUpInstruction !== undefined && { optionalWrapUpInstruction }),
    })
    .where(and(eq(moduleQuestions.questionId, qId), eq(moduleQuestions.moduleId, moduleId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Question not found" }); return; }
  res.json(updated);
});

/** DELETE /api/modules/:id/questions/:qId */
router.delete("/modules/:id/questions/:qId", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = parseInt(req.params.id, 10);
  const qId = parseInt(req.params.qId, 10);
  if (isNaN(moduleId) || isNaN(qId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [mod] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }
  if (mod.organizationId && !(await assertOrgAdmin(localUser, mod.organizationId, res))) return;

  await db.delete(moduleQuestions)
    .where(and(eq(moduleQuestions.questionId, qId), eq(moduleQuestions.moduleId, moduleId)));

  res.status(204).send();
});

/**
 * POST /api/modules/generate
 * Generate a full module draft using AI from a plain-text prompt.
 */
router.post("/modules/generate", requireLocalUser, async (req, res): Promise<void> => {
  try {
    const { prompt, difficulty, questionCount } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      res.status(400).json({ error: "prompt is required (min 5 characters)" });
      return;
    }

    const result = await generateModuleWithLLM({
      prompt: prompt.trim(),
      difficulty,
      questionCount: questionCount ? parseInt(questionCount, 10) : 3,
    });

    res.json(result);
  } catch (err: any) {
    if (err.code === "NO_API_KEY") {
      res.status(503).json({ error: err.message, code: "NO_API_KEY" });
    } else {
      console.error("POST /modules/generate error:", err);
      res.status(500).json({ error: err.message ?? "Generation failed" });
    }
  }
});

export default router;
