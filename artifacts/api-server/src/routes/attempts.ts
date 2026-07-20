import { Router, type IRouter } from "express";
import { db, attempts, modules, users, submissionScores, organizationMemberships, moduleQuestions } from "@workspace/db";
import { eq, and, desc, asc, inArray, count, avg, sql } from "drizzle-orm";
import { requireLocalUser, isPlatformOwner } from "../middleware/auth";
import { gradeWithLLM } from "../services/llmGraderService";
import { logEvent } from "../services/logEvent";

const router: IRouter = Router();

const ADMIN_ROLES = ["owner", "admin", "manager"];

// Max rows any list endpoint will return
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

async function isOrgAdmin(localUser: any, orgId: number): Promise<boolean> {
  if (isPlatformOwner(localUser)) return true;
  // Trust role from req.localUser when available — avoids redundant DB hit
  if (localUser.organizationId === orgId && ADMIN_ROLES.includes(localUser.role)) return true;
  const [m] = await db.select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.organizationId, orgId),
      eq(organizationMemberships.userId, localUser.userId),
      eq(organizationMemberships.status, "active"),
    )).limit(1);
  return !!(m && ADMIN_ROLES.includes(m.role));
}

/**
 * POST /api/attempts
 * Learner: start a new attempt for a module.
 */
router.post("/attempts", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { moduleId, orgId } = req.body;

  if (!moduleId || !orgId) { res.status(400).json({ error: "moduleId and orgId required" }); return; }

  const [mod] = await db.select().from(modules).where(eq(modules.moduleId, moduleId)).limit(1);
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }

  const [created] = await db.insert(attempts).values({
    userId: localUser.userId,
    moduleId,
    organizationId: orgId,
    attemptState: "in_progress",
    resultStatus: "pending_review",
    startedAt: new Date().toISOString(),
    questionResponses: "[]",
  }).returning();

  res.status(201).json(created);
});

/**
 * GET /api/attempts/my
 * Learner: get their attempts, optionally filtered by moduleId.
 * Supports ?limit=N&offset=N (max 200, default 100).
 */
router.get("/attempts/my", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string, 10) : undefined;
  const limit = Math.min(parseInt(req.query.limit as string || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

  const where = moduleId
    ? and(eq(attempts.userId, localUser.userId), eq(attempts.moduleId, moduleId))
    : eq(attempts.userId, localUser.userId);

  const rows = await db
    .select({
      attemptId: attempts.attemptId,
      moduleId: attempts.moduleId,
      attemptState: attempts.attemptState,
      resultStatus: attempts.resultStatus,
      totalScore: attempts.totalScore,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      gradedAt: attempts.gradedAt,
      questionResponses: attempts.questionResponses,
      moduleTitle: modules.title,
      moduleCategory: modules.category,
      moduleDifficulty: modules.difficulty,
    })
    .from(attempts)
    .innerJoin(modules, eq(modules.moduleId, attempts.moduleId))
    .where(where)
    .orderBy(desc(attempts.startedAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/**
 * GET /api/attempts
 * Admin: list all attempts for an org, filtered by status.
 * Supports ?limit=N&offset=N (max 200, default 100).
 */
router.get("/attempts", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);
  if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }

  if (!(await isOrgAdmin(localUser, orgId))) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  const statusFilter = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

  let where = eq(attempts.organizationId, orgId) as any;
  if (statusFilter) {
    where = and(eq(attempts.organizationId, orgId), eq(attempts.resultStatus, statusFilter));
  }

  const rows = await db
    .select({
      attemptId: attempts.attemptId,
      userId: attempts.userId,
      moduleId: attempts.moduleId,
      attemptState: attempts.attemptState,
      resultStatus: attempts.resultStatus,
      totalScore: attempts.totalScore,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      gradedAt: attempts.gradedAt,
      learnerName: users.name,
      learnerEmail: users.email,
      moduleTitle: modules.title,
      moduleCategory: modules.category,
    })
    .from(attempts)
    .innerJoin(users, eq(users.userId, attempts.userId))
    .innerJoin(modules, eq(modules.moduleId, attempts.moduleId))
    .where(where)
    .orderBy(desc(attempts.submittedAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/**
 * GET /api/attempts/:id
 * Get full attempt detail (learner sees own, admin sees any in their org).
 */
router.get("/attempts/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const attemptId = parseInt(req.params.id, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid attempt ID" }); return; }

  const [attempt] = await db
    .select({
      attemptId: attempts.attemptId,
      userId: attempts.userId,
      moduleId: attempts.moduleId,
      organizationId: attempts.organizationId,
      attemptState: attempts.attemptState,
      resultStatus: attempts.resultStatus,
      totalScore: attempts.totalScore,
      aiFeedback: attempts.aiFeedback,
      strengths: attempts.strengths,
      missedPoints: attempts.missedPoints,
      bestPracticeReasoning: attempts.bestPracticeReasoning,
      recommendedResponse: attempts.recommendedResponse,
      takeawaySummary: attempts.takeawaySummary,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      gradedAt: attempts.gradedAt,
      gradedByType: attempts.gradedByType,
      questionResponses: attempts.questionResponses,
      learnerName: users.name,
      learnerEmail: users.email,
      moduleTitle: modules.title,
      moduleCategory: modules.category,
      moduleDifficulty: modules.difficulty,
      scenarioContext: modules.scenarioContext,
      scenarioTicket: modules.scenarioTicket,
      hiddenRootCause: modules.hiddenRootCause,
      expectedDiagnosis: modules.expectedDiagnosis,
      expectedReasoningPath: modules.expectedReasoningPath,
      expectedNextSteps: modules.expectedNextSteps,
      llmScoringEnabled: modules.llmScoringEnabled,
      llmGraderInstructions: modules.llmGraderInstructions,
    })
    .from(attempts)
    .innerJoin(users, eq(users.userId, attempts.userId))
    .innerJoin(modules, eq(modules.moduleId, attempts.moduleId))
    .where(eq(attempts.attemptId, attemptId))
    .limit(1);

  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }

  // Access control: own attempt or org admin
  if (attempt.userId !== localUser.userId) {
    if (!attempt.organizationId || !(await isOrgAdmin(localUser, attempt.organizationId))) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  // Load questions and submission score in parallel
  const [questions, [score]] = await Promise.all([
    db.select()
      .from(moduleQuestions)
      .where(eq(moduleQuestions.moduleId, attempt.moduleId))
      .orderBy(asc(moduleQuestions.questionOrder)),
    db.select()
      .from(submissionScores)
      .where(eq(submissionScores.attemptId, attemptId))
      .limit(1),
  ]);

  res.json({ ...attempt, questions, submissionScore: score ?? null });
});

/**
 * PUT /api/attempts/:id
 * Learner: auto-save question responses.
 */
router.put("/attempts/:id", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const attemptId = parseInt(req.params.id, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db.select().from(attempts).where(eq(attempts.attemptId, attemptId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.userId !== localUser.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (existing.attemptState !== "in_progress") { res.status(400).json({ error: "Attempt already submitted" }); return; }

  const { questionResponses } = req.body;

  const [updated] = await db.update(attempts).set({
    questionResponses: typeof questionResponses === "string"
      ? questionResponses
      : JSON.stringify(questionResponses),
  }).where(eq(attempts.attemptId, attemptId)).returning();

  res.json(updated);
});

/**
 * POST /api/attempts/:id/submit
 * Learner: submit a completed attempt.
 */
router.post("/attempts/:id/submit", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const attemptId = parseInt(req.params.id, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db.select().from(attempts).where(eq(attempts.attemptId, attemptId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.userId !== localUser.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (existing.attemptState !== "in_progress") { res.status(400).json({ error: "Already submitted" }); return; }

  const { questionResponses } = req.body;

  const [updated] = await db.update(attempts).set({
    attemptState: "submitted",
    resultStatus: "pending_review",
    submittedAt: new Date().toISOString(),
    questionResponses: typeof questionResponses === "string"
      ? questionResponses
      : JSON.stringify(questionResponses),
  }).where(eq(attempts.attemptId, attemptId)).returning();

  // Log submission for the org audit trail
  void logEvent({
    level: "info",
    category: "grading",
    message: `Attempt #${attemptId} submitted for review`,
    metadata: { attemptId, moduleId: existing.moduleId },
    orgId: existing.organizationId,
    userId: localUser.userId,
  });

  res.json(updated);
});

/**
 * POST /api/attempts/:id/grade-ai
 * Admin: request AI-generated grade suggestions (returns preview for admin review — does NOT save).
 */
router.post("/attempts/:id/grade-ai", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const attemptId = parseInt(req.params.id, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [attempt] = await db
    .select({
      attemptId: attempts.attemptId,
      organizationId: attempts.organizationId,
      moduleId: attempts.moduleId,
      questionResponses: attempts.questionResponses,
      moduleTitle: modules.title,
      scenarioContext: modules.scenarioContext,
      hiddenRootCause: modules.hiddenRootCause,
      expectedDiagnosis: modules.expectedDiagnosis,
      expectedReasoningPath: modules.expectedReasoningPath,
      expectedNextSteps: modules.expectedNextSteps,
      llmScoringEnabled: modules.llmScoringEnabled,
      llmGraderInstructions: modules.llmGraderInstructions,
    })
    .from(attempts)
    .innerJoin(modules, eq(modules.moduleId, attempts.moduleId))
    .where(eq(attempts.attemptId, attemptId))
    .limit(1);

  if (!attempt) { res.status(404).json({ error: "Not found" }); return; }
  if (!attempt.organizationId || !(await isOrgAdmin(localUser, attempt.organizationId))) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  // Parse learner responses
  let parsedResponses: Array<{ questionId: number; response: string }> = [];
  try {
    const r = JSON.parse(attempt.questionResponses ?? "[]");
    parsedResponses = Array.isArray(r) ? r : [];
  } catch { /* ignore */ }

  // Load questions
  const questions = await db
    .select()
    .from(moduleQuestions)
    .where(eq(moduleQuestions.moduleId, attempt.moduleId))
    .orderBy(asc(moduleQuestions.questionOrder));

  const totalMaxPoints = questions.reduce((s, q) => s + (q.maxPoints ?? 0), 0);

  const gradeQuestions = questions.map(q => {
    const resp = parsedResponses.find(r => r.questionId === q.questionId);
    return {
      questionId: q.questionId,
      questionText: q.questionText ?? "",
      expectedAnswer: q.expectedAnswer ?? null,
      rubric: q.rubric ?? null,
      maxPoints: q.maxPoints ?? 0,
      learnerResponse: resp?.response ?? "",
    };
  });

  try {
    const result = await gradeWithLLM({
      moduleTitle: attempt.moduleTitle,
      scenarioContext: attempt.scenarioContext ?? null,
      hiddenRootCause: attempt.hiddenRootCause ?? null,
      expectedDiagnosis: attempt.expectedDiagnosis ?? null,
      expectedReasoningPath: attempt.expectedReasoningPath ?? null,
      expectedNextSteps: attempt.expectedNextSteps ?? null,
      graderInstructions: attempt.llmGraderInstructions ?? null,
      questions: gradeQuestions,
      totalMaxPoints,
    });
    res.json(result);
  } catch (err: any) {
    if (err.code === "NO_API_KEY") {
      res.status(503).json({ error: err.message, code: "NO_API_KEY" });
    } else {
      res.status(500).json({ error: err.message ?? "AI grading failed" });
    }
  }
});

/**
 * POST /api/attempts/:id/grade
 * Admin: grade a submitted attempt.
 */
router.post("/attempts/:id/grade", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const attemptId = parseInt(req.params.id, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [attempt] = await db.select().from(attempts).where(eq(attempts.attemptId, attemptId)).limit(1);
  if (!attempt) { res.status(404).json({ error: "Not found" }); return; }

  if (!attempt.organizationId || !(await isOrgAdmin(localUser, attempt.organizationId))) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  const {
    totalScore, overallFeedback, strengths, missedPoints,
    bestPracticeReasoning, recommendedResponse, takeawaySummary,
    resultStatus, scoringBreakdownJson,
    showResultsToLearner, showFeedbackToLearner,
  } = req.body;

  // Update attempt first
  const updatedAttempt = await db.update(attempts).set({
    totalScore: totalScore ?? null,
    aiFeedback: overallFeedback ?? null,
    strengths: strengths ?? null,
    missedPoints: missedPoints ?? null,
    bestPracticeReasoning: bestPracticeReasoning ?? null,
    recommendedResponse: recommendedResponse ?? null,
    takeawaySummary: takeawaySummary ?? null,
    attemptState: "graded",
    resultStatus: resultStatus ?? "approved",
    gradedAt: new Date().toISOString(),
    gradedByType: "manual",
    gradedByUserId: localUser.userId,
  }).where(eq(attempts.attemptId, attemptId)).returning().then(r => r[0]);

  const scoreValues = {
    adminTotalScore: String(totalScore ?? 0),
    finalTotalScore: String(totalScore ?? 0),
    overallAdminFeedback: overallFeedback ?? null,
    learnerStrengths: strengths ?? null,
    learnerMissedPoints: missedPoints ?? null,
    bestPracticeReasoning: bestPracticeReasoning ?? null,
    recommendedResponse: recommendedResponse ?? null,
    lessonTakeaway: takeawaySummary ?? null,
    gradingStatus: "graded",
    reviewStatus: resultStatus === "approved" ? "approved" : "submitted",
    scoringMethod: "manual",
    scoringBreakdownJson: scoringBreakdownJson ? JSON.stringify(scoringBreakdownJson) : null,
    showResultsToLearner: showResultsToLearner ?? true,
    showFeedbackToLearner: showFeedbackToLearner ?? true,
    showOverallScoreToLearner: showResultsToLearner ?? true,
    scoredAt: new Date().toISOString(),
  };

  // Upsert score — ON CONFLICT handles the race condition when two admins
  // grade the same attempt simultaneously (unique constraint on attempt_id).
  const [score] = await db.insert(submissionScores)
    .values({
      attemptId,
      totalScore: totalScore ?? 0,
      solutionScore: 0,
      ...scoreValues,
    })
    .onConflictDoUpdate({
      target: submissionScores.attemptId,
      set: scoreValues,
    })
    .returning();

  // Log the grading event for the org's audit trail
  await logEvent({
    level: "info",
    category: "grading",
    message: `Attempt #${attemptId} graded — score: ${totalScore ?? 0}, status: ${resultStatus ?? "approved"}`,
    metadata: { attemptId, totalScore, resultStatus },
    orgId: attempt.organizationId,
    userId: localUser.userId,
  });

  res.json({ attempt: updatedAttempt, score });
});

/**
 * GET /api/progress/org?orgId=1
 * Admin: org-wide progress summary — uses SQL aggregation instead of JS-side filtering.
 */
router.get("/progress/org", requireLocalUser, async (req, res): Promise<void> => {
  try {
    const localUser = (req as any).localUser;
    const orgId = parseInt(req.query.orgId as string, 10);
    if (isNaN(orgId)) { res.status(400).json({ error: "orgId required" }); return; }

    if (!(await isOrgAdmin(localUser, orgId))) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }

    const limit = Math.min(parseInt(req.query.limit as string || "100", 10), MAX_LIMIT);
    const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

    // Aggregate counts and avg score in SQL — no JS-side fan-out
    const [stats] = await db
      .select({
        total: count(),
        submitted: sql<number>`COUNT(*) FILTER (WHERE ${attempts.attemptState} = 'submitted')`,
        graded:    sql<number>`COUNT(*) FILTER (WHERE ${attempts.attemptState} = 'graded')`,
        inProgress: sql<number>`COUNT(*) FILTER (WHERE ${attempts.attemptState} = 'in_progress')`,
        avgScore:  sql<number>`AVG(${attempts.totalScore}) FILTER (WHERE ${attempts.totalScore} IS NOT NULL)`,
      })
      .from(attempts)
      .where(eq(attempts.organizationId, orgId));

    // Recent attempts — paginated
    const recentAttempts = await db
      .select({
        attemptId: attempts.attemptId,
        userId: attempts.userId,
        moduleId: attempts.moduleId,
        attemptState: attempts.attemptState,
        resultStatus: attempts.resultStatus,
        totalScore: attempts.totalScore,
        submittedAt: attempts.submittedAt,
        learnerName: users.name,
        moduleTitle: modules.title,
        moduleCategory: modules.category,
      })
      .from(attempts)
      .innerJoin(users, eq(users.userId, attempts.userId))
      .innerJoin(modules, eq(modules.moduleId, attempts.moduleId))
      .where(eq(attempts.organizationId, orgId))
      .orderBy(desc(attempts.submittedAt))
      .limit(limit)
      .offset(offset);

    res.json({
      total: Number(stats?.total ?? 0),
      submitted: Number(stats?.submitted ?? 0),
      graded: Number(stats?.graded ?? 0),
      inProgress: Number(stats?.inProgress ?? 0),
      avgScore: stats?.avgScore ?? null,
      attempts: recentAttempts,
    });
  } catch (err) {
    console.error("GET /progress/org error:", err);
    res.status(500).json({ error: "Failed to load progress data" });
  }
});

export default router;
