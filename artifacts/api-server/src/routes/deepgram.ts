import { Router, type IRouter } from "express";
import express from "express";
import { requireLocalUser } from "../middleware/auth";
import { Readable } from "stream";

const router: IRouter = Router();

const DG_KEY  = () => process.env.DEEPGRAM_API_KEY;
const DG_BASE = "https://api.deepgram.com/v1";

/**
 * POST /api/deepgram/transcribe
 * Learner sends a raw audio blob (webm/ogg/mp4 — whatever MediaRecorder produces).
 * We proxy it straight to Deepgram Nova-2 and return the plain-text transcript.
 *
 * Content-Type must be the audio MIME type, not application/json.
 * express.raw() captures the binary body before JSON middleware can reject it.
 */
router.post(
  "/deepgram/transcribe",
  requireLocalUser,
  express.raw({ type: "*/*", limit: "25mb" }),
  async (req, res): Promise<void> => {
    const key = DG_KEY();
    if (!key) { res.status(503).json({ error: "Deepgram not configured on this server" }); return; }
    if (!req.body || req.body.length === 0) { res.status(400).json({ error: "Empty audio body" }); return; }

    const contentType = (req.headers["content-type"] as string) || "audio/webm";

    try {
      const dgRes = await fetch(
        `${DG_BASE}/listen?model=nova-2&smart_format=true&punctuate=true&language=en`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${key}`,
            "Content-Type": contentType,
          },
          body: req.body as Buffer,
        }
      );

      if (!dgRes.ok) {
        const errText = await dgRes.text();
        res.status(dgRes.status).json({ error: `Deepgram STT error: ${errText}` });
        return;
      }

      const data = (await dgRes.json()) as any;
      const transcript: string =
        data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

      res.json({ transcript });
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? "Transcription failed" });
    }
  }
);

/**
 * POST /api/deepgram/speak
 * Body: { text: string }
 * Streams Deepgram Aura TTS audio (audio/mpeg) back to the client.
 */
router.post(
  "/deepgram/speak",
  requireLocalUser,
  async (req, res): Promise<void> => {
    const key = DG_KEY();
    if (!key) { res.status(503).json({ error: "Deepgram not configured on this server" }); return; }

    const { text, voice = "aura-asteria-en" } = req.body as { text: string; voice?: string };
    if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

    // Truncate very long strings — TTS has practical limits
    const truncated = text.slice(0, 3000);

    try {
      const dgRes = await fetch(
        `${DG_BASE}/speak?model=${voice}&encoding=mp3`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: truncated }),
        }
      );

      if (!dgRes.ok) {
        const errText = await dgRes.text();
        res.status(dgRes.status).json({ error: `Deepgram TTS error: ${errText}` });
        return;
      }

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");

      // Stream Deepgram's response body directly to the HTTP client
      const nodeStream = Readable.fromWeb(dgRes.body as any);
      nodeStream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ error: err.message ?? "TTS failed" });
    }
  }
);

export default router;
