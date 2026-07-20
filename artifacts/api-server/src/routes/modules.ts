import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { modules, moduleQuestions, organizationMemberships, assignments } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireLocalUser, isPlatformOwner } from "../middleware/auth";
import { generateModuleWithLLM } from "../services/llmModuleGeneratorService";

const router: IRouter = Router();

const ADMIN_ROLES = ["owner", "admin", "manager"];
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

async function assertOrgAdmin(localUser: any, orgId: number, res: any): Promise<boolean> {
  if (isPlatformOwner(localUser)) return true;
  // Trust role from req.localUser when possible — avoids an extra DB hit
  if (localUser.organizationId === orgId && ADMIN_ROLES.includes(localUser.role)) return true;

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

/** GET /api/modules?orgId=1 — supports ?limit=N&offset=N */
router.get("/modules", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const orgId = parseInt(req.query.orgId as string, 10);

  if (isNaN(orgId)) {
    res.status(400).json({ error: "orgId query param required" });
    return;
  }

  if (!(await assertOrgAdmin(localUser, orgId, res))) return;

  const limit = Math.min(parseInt(req.query.limit as string || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset as string || "0", 10), 0);

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
    .orderBy(asc(modules.createdAt))
    .limit(limit)
    .offset(offset);

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
      status: status ?? "active",
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

  // Wrap MAX(order) + INSERT in a transaction with a row-lock so concurrent
  // additions to the same module can't race and produce duplicate order values.
  const [created] = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ questionOrder: moduleQuestions.questionOrder })
      .from(moduleQuestions)
      .where(eq(moduleQuestions.moduleId, moduleId))
      .for("update");            // holds a row-level lock for the duration of this tx

    const nextOrder = existing.length > 0
      ? Math.max(...existing.map(q => q.questionOrder)) + 1
      : 1;

    return tx
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
  });

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

/**
 * POST /api/modules/plan-chat
 * Conversational AI planning agent for module creation.
 * Body: { messages: {role: "user"|"assistant", content: string}[] }
 * Returns: { done: false, message: string }
 *       or { done: true,  message: string, module: GeneratedModule }
 *
 * The AI is instructed to gather context in ≤4 exchanges then output
 * <GENERATE>{json}</GENERATE> — we parse and return it as the module.
 */
router.post("/modules/plan-chat", requireLocalUser, async (req, res): Promise<void> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OpenAI API key not configured", code: "NO_API_KEY" });
    return;
  }

  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const SYSTEM = `You are Nova, a warm, sharp, and genuinely curious instructional design consultant. You help training admins build rich, realistic simulation modules by having a real conversation — not an intake form.

Your personality:
- Enthusiastic but not over-the-top. Think: expert colleague, not a customer service bot.
- Ask thoughtful follow-ups. If someone says "customer service training", dig in: what kind of customers? what's going wrong right now? what does a great rep do that an average one doesn't?
- Use natural conversational language. Contractions, short sentences, the occasional "That's a great angle" or "Interesting — tell me more about that."
- Keep each message SHORT — 1-3 sentences. You're in a voice conversation; nobody wants a wall of text.
- Never sound like you're filling out a form. Flow naturally.

Your goal: build a deep, nuanced understanding of the training need before you generate anything. You want to know:
- The scenario, skill, or situation being trained
- Who the learners are (role, experience level, what they struggle with)
- What "great" looks like — the specific behaviours or decisions you want to see
- The emotional or situational stakes (angry customer? high-pressure sales call? compliance risk?)
- Any real examples, edge cases, or failure modes the admin has seen
- What they've tried before and what didn't work (if relevant)
- Whether there are specific objections, personas, or scripts the AI character should use
- **For every ai_conversation question**: the AI character's personality and difficulty level. Ask specifically:
  - How do they want the character to come across? (Friendly and approachable? Neutral and professional? Difficult and demanding? Angry and hostile?)
  - What specific traits? (Stubborn and won't budge easily? Argumentative and challenges everything? Passive-aggressive? Easily escalated? Emotional? Formal and cold? Condescending?)
  - What does it take to calm them down or win them over — or are they unwinnable?
  - Any specific lines, complaints, or objections this character would typically throw at the learner?

Before you generate, check in: "I think I have a solid picture — want to add anything before I build it? Any edge cases or specific moments you really want covered?"

Only output <GENERATE> when you're confident the module will be genuinely useful — not just technically complete.

Conversation rules:
- One question or thought per turn. Never dump multiple questions at once.
- If the user's answer is vague, ask one specific follow-up before moving on.
- If they've given you enough on a topic, move to the next naturally — don't ask questions you already have answers to.
- The conversation can run as long as it needs to. Don't rush.
- When you're ready to generate, say something natural like "Alright, I've got everything I need — let me build this for you." then output the JSON block.

When you generate, output your closing spoken line, then:
<GENERATE>
{the complete module JSON}
</GENERATE>

JSON schema:
{
  "title": string,
  "category": string,
  "difficulty": "beginner"|"intermediate"|"advanced",
  "description": string,
  "estimatedTime": string,
  "learningObjectives": string,
  "scenarioTicket": string,
  "scenarioContext": string,
  "hiddenRootCause": string,
  "expectedDiagnosis": string,
  "expectedReasoningPath": string,
  "expectedNextSteps": string,
  "lessonTakeaway": string,
  "llmScoringEnabled": true,
  "llmGraderInstructions": string,
  "questions": [
    {
      "questionText": string,
      "expectedAnswer": string,
      "maxPoints": 10|15|20,
      "questionType": "open_text"|"ai_conversation",
      "rubric": string,
      "aiRoleOrPersona": string,
      "aiConversationPrompt": string,
      "evaluationFocus": string
    }
  ]
}

Generate 4-6 questions. Mix open_text and ai_conversation. Make them progressively harder and grounded in what the admin told you.
The scenarioContext should be 3-5 paragraphs, richly detailed, and feel like a real situation the learner is stepping into.
For ai_conversation questions:
- aiRoleOrPersona: short display name like "Angry Customer — Maria" or "Stubborn Manager — Derek" (include a first name for realism)
- aiConversationPrompt: a full character brief an actor could use. Include: who they are, their emotional state, their specific personality traits and HOW those traits show up in conversation (give examples of lines they'd say), what makes them escalate, what it takes to de-escalate or win them over, and their communication style. Be specific — "stubborn" is not enough. Write it so the AI can convincingly embody this character.

Start the very first turn with a warm, brief greeting as Nova and your first question.`;

  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Check for <GENERATE> tag
    const match = raw.match(/<GENERATE>([\s\S]*?)<\/GENERATE>/);
    if (match) {
      const spoken = raw.replace(/<GENERATE>[\s\S]*<\/GENERATE>/, "").trim()
        || "Perfect — I have everything I need. Building your module now!";
      try {
        const moduleData = JSON.parse(match[1].trim());
        // Normalise via the same validator used by generateModuleWithLLM
        const { generateModuleWithLLM: _ } = await import("../services/llmModuleGeneratorService");
        const questions = Array.isArray(moduleData.questions) ? moduleData.questions : [];
        const normalised = {
          title:                 String(moduleData.title ?? ""),
          category:              String(moduleData.category ?? ""),
          difficulty:            (["beginner","intermediate","advanced"].includes(moduleData.difficulty)
                                  ? moduleData.difficulty : "intermediate") as "beginner"|"intermediate"|"advanced",
          description:           String(moduleData.description ?? ""),
          estimatedTime:         String(moduleData.estimatedTime ?? ""),
          learningObjectives:    String(moduleData.learningObjectives ?? ""),
          scenarioTicket:        String(moduleData.scenarioTicket ?? ""),
          scenarioContext:       String(moduleData.scenarioContext ?? ""),
          hiddenRootCause:       String(moduleData.hiddenRootCause ?? ""),
          expectedDiagnosis:     String(moduleData.expectedDiagnosis ?? ""),
          expectedReasoningPath: String(moduleData.expectedReasoningPath ?? ""),
          expectedNextSteps:     String(moduleData.expectedNextSteps ?? ""),
          lessonTakeaway:        String(moduleData.lessonTakeaway ?? ""),
          llmScoringEnabled:     moduleData.llmScoringEnabled !== false,
          llmGraderInstructions: String(moduleData.llmGraderInstructions ?? ""),
          questions: questions.map((q: any) => ({
            questionText:        String(q.questionText ?? ""),
            expectedAnswer:      String(q.expectedAnswer ?? ""),
            maxPoints:           Number(q.maxPoints) || 10,
            questionType:        q.questionType === "ai_conversation" ? "ai_conversation" : "open_text",
            rubric:              String(q.rubric ?? ""),
            aiRoleOrPersona:     String(q.aiRoleOrPersona ?? ""),
            aiConversationPrompt:String(q.aiConversationPrompt ?? ""),
            evaluationFocus:     String(q.evaluationFocus ?? ""),
          })),
        };
        res.json({ done: true, message: spoken, module: normalised });
      } catch {
        // Bad JSON — treat as a normal reply and let the client retry
        res.json({ done: false, message: raw });
      }
      return;
    }

    res.json({ done: false, message: raw });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Planning chat failed" });
  }
});

export default router;
