import OpenAI from "openai";

export interface GeneratedModule {
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  estimatedTime: string;
  learningObjectives: string;
  scenarioTicket: string;
  scenarioContext: string;
  hiddenRootCause: string;
  expectedDiagnosis: string;
  expectedReasoningPath: string;
  expectedNextSteps: string;
  lessonTakeaway: string;
  llmScoringEnabled: boolean;
  llmGraderInstructions: string;
  questions: Array<{
    questionText: string;
    expectedAnswer: string;
    maxPoints: number;
    questionType: "open_text" | "ai_conversation";
    rubric: string;
    aiRoleOrPersona: string;
    aiConversationPrompt: string;
    evaluationFocus: string;
  }>;
}

export async function generateModuleWithLLM(opts: {
  prompt: string;
  difficulty?: string;
  questionCount?: number;
}): Promise<GeneratedModule> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error("OpenAI API key is not configured. Add OPENAI_API_KEY to your environment secrets."),
      { code: "NO_API_KEY" }
    );
  }

  const client = new OpenAI({ apiKey });
  const numQuestions = Math.min(Math.max(opts.questionCount ?? 3, 1), 8);
  const difficulty = opts.difficulty ?? "intermediate";

  const system = `You are an expert instructional designer creating training simulation modules for professional teams.
Given a brief description of a training topic, generate a complete, realistic, and engaging training module.

Respond ONLY with a valid JSON object matching this exact shape — no markdown, no extra text:
{
  "title": "<concise module title>",
  "category": "<category, e.g. Customer Service, Sales, Compliance, Technical Support>",
  "difficulty": "${difficulty}",
  "description": "<2-3 sentence description shown to learners>",
  "estimatedTime": "<e.g. 20 mins, 45 mins>",
  "learningObjectives": "<bullet list of 3-4 learning objectives>",
  "scenarioTicket": "<a realistic support ticket or scenario title, e.g. '#2841 – Customer unable to process refund'>",
  "scenarioContext": "<3-5 paragraphs of realistic scenario background given to the learner. Include customer details, history, urgency, and any relevant context. Make it feel real.>",
  "hiddenRootCause": "<the actual root cause hidden from the learner — what a skilled professional would identify>",
  "expectedDiagnosis": "<the correct conclusion a skilled learner should reach>",
  "expectedReasoningPath": "<the logical investigation steps a skilled professional would take>",
  "expectedNextSteps": "<concrete actions the learner should recommend or take after diagnosis>",
  "lessonTakeaway": "<1-2 sentence key lesson or principle this scenario teaches>",
  "llmScoringEnabled": true,
  "llmGraderInstructions": "<specific grading instructions for the AI — what to look for, scoring emphasis, partial credit rules>",
  "questions": [<array of exactly ${numQuestions} question objects>]
}

Each question object must match:
{
  "questionText": "<the question asked to the learner>",
  "expectedAnswer": "<ideal answer a skilled professional would give>",
  "maxPoints": <10, 15, or 20>,
  "questionType": "<'open_text' or 'ai_conversation'>",
  "rubric": "<grading rubric: what earns full credit, partial credit, zero>",
  "aiRoleOrPersona": "<if ai_conversation: the AI character persona, e.g. 'Frustrated long-time customer who has been waiting 3 days for a refund'. Empty string if open_text.>",
  "aiConversationPrompt": "<if ai_conversation: system instructions for the AI playing this role. Empty string if open_text.>",
  "evaluationFocus": "<what the grader focuses on when evaluating this answer>"
}

Guidelines:
- Make questions progressively harder — start with diagnosis, build to resolution and best practices.
- Mix open_text and ai_conversation types for engagement.
- The scenario must feel realistic and professionally relevant.
- The hidden root cause should be non-obvious but discoverable through good technique.
- Learning objectives should map directly to the questions.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Generate a training module for: ${opts.prompt}` },
    ],
    max_tokens: 4000,
    temperature: 0.8,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Validate and normalise
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  return {
    title: String(parsed.title ?? ""),
    category: String(parsed.category ?? ""),
    difficulty: ["beginner", "intermediate", "advanced"].includes(parsed.difficulty)
      ? parsed.difficulty
      : "intermediate",
    description: String(parsed.description ?? ""),
    estimatedTime: String(parsed.estimatedTime ?? ""),
    learningObjectives: String(parsed.learningObjectives ?? ""),
    scenarioTicket: String(parsed.scenarioTicket ?? ""),
    scenarioContext: String(parsed.scenarioContext ?? ""),
    hiddenRootCause: String(parsed.hiddenRootCause ?? ""),
    expectedDiagnosis: String(parsed.expectedDiagnosis ?? ""),
    expectedReasoningPath: String(parsed.expectedReasoningPath ?? ""),
    expectedNextSteps: String(parsed.expectedNextSteps ?? ""),
    lessonTakeaway: String(parsed.lessonTakeaway ?? ""),
    llmScoringEnabled: parsed.llmScoringEnabled !== false,
    llmGraderInstructions: String(parsed.llmGraderInstructions ?? ""),
    questions: questions.map((q: any) => ({
      questionText: String(q.questionText ?? ""),
      expectedAnswer: String(q.expectedAnswer ?? ""),
      maxPoints: Number(q.maxPoints) || 10,
      questionType: q.questionType === "ai_conversation" ? "ai_conversation" : "open_text",
      rubric: String(q.rubric ?? ""),
      aiRoleOrPersona: String(q.aiRoleOrPersona ?? ""),
      aiConversationPrompt: String(q.aiConversationPrompt ?? ""),
      evaluationFocus: String(q.evaluationFocus ?? ""),
    })),
  };
}
