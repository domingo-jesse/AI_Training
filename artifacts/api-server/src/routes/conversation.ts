import { Router } from "express";
import { requireLocalUser } from "../middleware/auth";

const router = Router();

/**
 * POST /api/conversation/chat
 * Real-time in-character AI response for learner simulation questions.
 * The AI stays in character as the persona described in systemPrompt.
 */
router.post("/conversation/chat", requireLocalUser, async (req, res): Promise<void> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OpenAI API key not configured" });
    return;
  }

  const { persona, systemPrompt, history, userMessage } = req.body as {
    persona: string;
    systemPrompt: string;
    history: { role: "user" | "assistant"; content: string }[];
    userMessage: string;
  };

  if (!persona || !systemPrompt || !userMessage) {
    res.status(400).json({ error: "persona, systemPrompt, and userMessage are required" });
    return;
  }

  const CHARACTER_SYSTEM = `You are roleplaying as a character in a workplace training simulation. Stay in character at ALL times.

CHARACTER BRIEF:
${systemPrompt}

CRITICAL RULES:
- You ARE this character. Never break character, never acknowledge you are an AI.
- Respond as this character would genuinely respond — with their real emotions, communication style, and personality traits.
- Keep your responses SHORT — 2-4 sentences maximum. This is a voice conversation.
- Don't summarise or narrate. Just react and speak as the character.
- The learner is being evaluated on how they handle YOU. Give them something real to work with.
- If the learner handles you well, you can soften slightly — but don't flip instantly. Make them earn it.
- If the learner is rude, dismissive, or wrong, stay true to your character's reaction.
- Never offer solutions yourself — you are the challenge the learner must handle.`;

  const messages = [
    { role: "system" as const, content: CHARACTER_SYSTEM },
    ...(history ?? []).map(m => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.85, // slight higher temp for personality variety
      max_tokens: 200,   // keep responses punchy
    });

    const message = completion.choices[0]?.message?.content?.trim() ?? "…";
    res.json({ message });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "AI call failed" });
  }
});

export default router;
