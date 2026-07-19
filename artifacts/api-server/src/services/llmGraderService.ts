import OpenAI from "openai";

export interface GradeQuestion {
  questionId: number;
  questionText: string;
  expectedAnswer: string | null;
  rubric: string | null;
  maxPoints: number;
  learnerResponse: string;
}

export interface LLMGradeResult {
  totalScore: number;
  overallFeedback: string;
  strengths: string;
  missedPoints: string;
  bestPracticeReasoning: string;
  recommendedResponse: string;
  takeawaySummary: string;
  resultStatus: "approved" | "rejected";
  reasoning: object;
}

function buildPrompt(opts: {
  moduleTitle: string;
  scenarioContext: string | null;
  hiddenRootCause: string | null;
  expectedDiagnosis: string | null;
  expectedReasoningPath: string | null;
  expectedNextSteps: string | null;
  graderInstructions: string | null;
  questions: GradeQuestion[];
  totalMaxPoints: number;
}): { system: string; user: string } {
  const system = `You are an expert training evaluator grading a learner's simulation attempt.
You will receive a scenario, grading criteria, and the learner's responses. Return a JSON object with your evaluation.

${opts.graderInstructions ? `\nCustom grading instructions:\n${opts.graderInstructions}\n` : ""}

Respond ONLY with a JSON object matching this exact shape:
{
  "totalScore": <number, 0 to ${opts.totalMaxPoints}>,
  "resultStatus": <"approved" | "rejected">,
  "overallFeedback": <string, 2-4 sentences of balanced feedback>,
  "strengths": <string, bullet points of what the learner did well>,
  "missedPoints": <string, bullet points of key gaps or errors>,
  "bestPracticeReasoning": <string, explanation of the ideal approach>,
  "recommendedResponse": <string, a model answer the learner can learn from>,
  "takeawaySummary": <string, 1-2 sentence lesson for the learner>,
  "perQuestion": [
    { "questionId": <number>, "score": <number>, "feedback": <string> }
  ]
}

Scoring guidance:
- Be fair but rigorous. A score of 0 means no credit; max means fully correct.
- "approved" if totalScore >= 60% of max; "rejected" otherwise.
- Keep feedback constructive and specific.`;

  const lines: string[] = [`Module: ${opts.moduleTitle}`];

  if (opts.scenarioContext) lines.push(`\nScenario:\n${opts.scenarioContext}`);
  if (opts.hiddenRootCause) lines.push(`Root cause (not shown to learner): ${opts.hiddenRootCause}`);
  if (opts.expectedDiagnosis) lines.push(`Expected diagnosis: ${opts.expectedDiagnosis}`);
  if (opts.expectedReasoningPath) lines.push(`Expected reasoning path: ${opts.expectedReasoningPath}`);
  if (opts.expectedNextSteps) lines.push(`Expected next steps: ${opts.expectedNextSteps}`);

  lines.push(`\nTotal max points: ${opts.totalMaxPoints}`);
  lines.push(`\nQuestions and learner responses:`);

  opts.questions.forEach((q, i) => {
    lines.push(`\nQ${i + 1} [${q.maxPoints} pts]: ${q.questionText}`);
    if (q.expectedAnswer) lines.push(`Expected answer: ${q.expectedAnswer}`);
    if (q.rubric) lines.push(`Rubric: ${q.rubric}`);
    lines.push(`Learner response: ${q.learnerResponse || "(no response)"}`);
  });

  return { system, user: lines.join("\n") };
}

export async function gradeWithLLM(opts: {
  moduleTitle: string;
  scenarioContext: string | null;
  hiddenRootCause: string | null;
  expectedDiagnosis: string | null;
  expectedReasoningPath: string | null;
  expectedNextSteps: string | null;
  graderInstructions: string | null;
  questions: GradeQuestion[];
  totalMaxPoints: number;
}): Promise<LLMGradeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("OpenAI API key is not configured. Add OPENAI_API_KEY to your environment secrets."), { code: "NO_API_KEY" });
  }

  const client = new OpenAI({ apiKey });
  const { system, user } = buildPrompt(opts);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  const totalScore = Math.min(
    Math.max(Number(parsed.totalScore) || 0, 0),
    opts.totalMaxPoints || 9999,
  );

  return {
    totalScore,
    overallFeedback: String(parsed.overallFeedback ?? ""),
    strengths: String(parsed.strengths ?? ""),
    missedPoints: String(parsed.missedPoints ?? ""),
    bestPracticeReasoning: String(parsed.bestPracticeReasoning ?? ""),
    recommendedResponse: String(parsed.recommendedResponse ?? ""),
    takeawaySummary: String(parsed.takeawaySummary ?? ""),
    resultStatus: parsed.resultStatus === "rejected" ? "rejected" : "approved",
    reasoning: parsed,
  };
}
