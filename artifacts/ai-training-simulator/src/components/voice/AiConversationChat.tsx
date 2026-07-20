/**
 * AiConversationChat — learner-facing real-time AI character simulation.
 *
 * Mirrors the Nova planning panel's VAD/waveform UX but the AI stays in
 * character as the scenario persona (angry customer, stubborn manager, etc.).
 *
 * Props:
 *   question       — the opening line the AI "says" to start the scene
 *   persona        — display name  e.g. "Frustrated Customer — Maria"
 *   systemPrompt   — full character brief for GPT
 *   onComplete(transcript) — called when learner ends the session
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, PhoneOff, User } from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// VAD config  (same as planning panel)
// ─────────────────────────────────────────────────────────────────────────────
const SPEECH_THRESHOLD = 12;
const SILENCE_AFTER_MS = 1500;
const MIN_SPEECH_MS    = 400;

// ─────────────────────────────────────────────────────────────────────────────
// Personality → colour theme
// ─────────────────────────────────────────────────────────────────────────────
function detectTone(text: string): "angry" | "difficult" | "friendly" | "neutral" {
  const t = text.toLowerCase();
  if (/angry|irate|hostile|furious|aggress|livid|upset|frustrated/.test(t)) return "angry";
  if (/difficult|stubborn|argumentat|demanding|resistant|skeptic|pushback/.test(t)) return "difficult";
  if (/friendly|happy|cheerful|positive|enthusiastic|warm|approachable/.test(t)) return "friendly";
  return "neutral";
}

const TONE_STYLES = {
  angry:     { ring: "border-red-500/60",    bg: "from-red-700 to-red-900",       pulse: "bg-red-500/25",   wave: "bg-red-400",    label: "bg-red-500/20 border-red-500/40 text-red-300"   },
  difficult: { ring: "border-orange-500/60", bg: "from-orange-700 to-orange-900", pulse: "bg-orange-500/25",wave: "bg-orange-400", label: "bg-orange-500/20 border-orange-500/40 text-orange-300" },
  friendly:  { ring: "border-emerald-500/60",bg: "from-emerald-600 to-teal-800",  pulse: "bg-emerald-500/25",wave: "bg-emerald-400",label: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  neutral:   { ring: "border-indigo-500/60", bg: "from-indigo-700 to-violet-900", pulse: "bg-indigo-500/25", wave: "bg-indigo-400", label: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"  },
};

const TONE_EMOJI = { angry: "😤", difficult: "😒", friendly: "😊", neutral: "🧑‍💼" };

// ─────────────────────────────────────────────────────────────────────────────
// TTS
// ─────────────────────────────────────────────────────────────────────────────
async function speakText(text: string): Promise<void> {
  const res = await fetch(`${base}/api/deepgram/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text: text.slice(0, 600) }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  return new Promise<void>(resolve => {
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play().catch(() => resolve());
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Waveform canvas (real analyser data)
// ─────────────────────────────────────────────────────────────────────────────
function UserWaveform({ analyserRef, active, color }: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
  color: string; // tailwind bg class
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (!active || !analyserRef.current) {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const analyser = analyserRef.current;
    const data     = new Uint8Array(analyser.frequencyBinCount);
    const W = canvas.width, H = canvas.height;
    const N = 36;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, W, H);
      const step = Math.floor(data.length / N);
      const bw   = W / N - 1.5;
      for (let i = 0; i < N; i++) {
        const v = data[i * step] / 255;
        const h = Math.max(3, v * H * 0.92);
        ctx.fillStyle = `rgba(167,139,250,${0.4 + v * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(i * (bw + 1.5), (H - h) / 2, bw, h, 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyserRef, color]);

  return <canvas ref={canvasRef} width={280} height={56} className="w-full max-w-[280px] h-14" />;
}

// CSS wave for AI speaking
function AiWave({ waveClass }: { waveClass: string }) {
  return (
    <div className="flex items-center justify-center gap-[2.5px] h-14 w-full max-w-[280px]">
      {Array.from({ length: 36 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${waveClass}`}
          style={{ animation: `ai-char-wave 0.75s ease-in-out ${(i % 6) * 0.1}s infinite alternate`, minHeight: 3 }}
        />
      ))}
      <style>{`@keyframes ai-char-wave { from { height:3px; opacity:.25 } to { height:48px; opacity:.95 } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type ConvPhase = "ai-speaking" | "listening" | "user-speaking" | "transcribing" | "ai-thinking" | "ended";
interface ChatMsg { role: "user" | "ai"; text: string; }

interface AiConversationChatProps {
  question:     string;  // opening line the AI says
  persona:      string;  // display name
  systemPrompt: string;  // character brief
  onComplete:   (transcript: string) => void;
}

export function AiConversationChat({ question, persona, systemPrompt, onComplete }: AiConversationChatProps) {
  const [messages,  setMessages]  = useState<ChatMsg[]>([]);
  const [phase,     setPhase]     = useState<ConvPhase>("ai-speaking");
  const [input,     setInput]     = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [userTurns, setUserTurns] = useState(0);

  const tone   = detectTone(systemPrompt + " " + persona);
  const styles = TONE_STYLES[tone];

  // Refs
  const messagesRef    = useRef<ChatMsg[]>([]);
  const phaseRef       = useRef<ConvPhase>("ai-speaking");
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const rafRef         = useRef<number>(0);
  const speechStartRef = useRef<number>(0);
  const lastSpeechRef  = useRef<number>(0);
  const isSpeakingRef  = useRef(false);
  const scrollRef      = useRef<HTMLDivElement>(null);

  const setMsg = (msgs: ChatMsg[]) => { messagesRef.current = msgs; setMessages(msgs); };
  const setP   = (p: ConvPhase)    => { phaseRef.current = p;       setPhase(p); };

  const scrollToBottom = () =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );

  // ── Teardown ───────────────────────────────────────────────────────────────

  const teardownMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (recorderRef.current?.state !== "inactive") { try { recorderRef.current!.stop(); } catch {} }
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    recorderRef.current = null; streamRef.current = null;
    audioCtxRef.current = null; analyserRef.current = null;
    isSpeakingRef.current = false; chunksRef.current = [];
  }, []);

  useEffect(() => () => teardownMic(), []); // eslint-disable-line

  // ── Compile transcript for grading ───────────────────────────────────────

  const buildTranscript = (msgs: ChatMsg[]) =>
    msgs.map(m =>
      m.role === "ai"
        ? `[${persona}]: ${m.text}`
        : `[You]: ${m.text}`
    ).join("\n\n");

  // ── AI character chat call ────────────────────────────────────────────────

  const callCharacter = async (userText: string, history: ChatMsg[]): Promise<string> => {
    // Convert to OpenAI format — AI msgs are "assistant", user msgs are "user"
    const apiHistory = history.map(m => ({
      role: m.role === "ai" ? "assistant" as const : "user" as const,
      content: m.text,
    }));
    const res = await fetch(`${base}/api/conversation/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ persona, systemPrompt, history: apiHistory, userMessage: userText }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Chat failed");
    return (await res.json()).message;
  };

  // ── Handle a user turn ────────────────────────────────────────────────────

  const handleUserTurn = useCallback(async (text: string) => {
    const userMsg: ChatMsg = { role: "user", text };
    const withUser = [...messagesRef.current, userMsg];
    setMsg(withUser);
    setInput("");
    setUserTurns(t => t + 1);
    scrollToBottom();
    setP("ai-thinking");
    setChatError(null);

    try {
      const reply = await callCharacter(text, withUser);
      const withAi = [...withUser, { role: "ai" as const, text: reply }];
      setMsg(withAi);
      scrollToBottom();
      setP("ai-speaking");
      await speakText(reply);
      restartVAD();
    } catch (err: any) {
      setChatError(err.message ?? "Something went wrong");
      restartVAD();
    }
  }, []); // eslint-disable-line

  // ── VAD loop ──────────────────────────────────────────────────────────────

  const restartVAD = useCallback(() => {
    const recorder = recorderRef.current;
    const analyser = analyserRef.current;
    if (!recorder || !analyser || recorder.state !== "inactive") return;

    isSpeakingRef.current = false;
    chunksRef.current     = [];
    setP("listening");

    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const p = phaseRef.current;
      if (p !== "listening" && p !== "user-speaking") return;

      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;

      if (avg > SPEECH_THRESHOLD) {
        lastSpeechRef.current = Date.now();
        if (!isSpeakingRef.current) {
          isSpeakingRef.current  = true;
          speechStartRef.current = Date.now();
          chunksRef.current      = [];
          if (recorder.state === "inactive") {
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            try { recorder.start(80); } catch {}
          }
          setP("user-speaking");
        }
      } else if (isSpeakingRef.current) {
        if (Date.now() - lastSpeechRef.current >= SILENCE_AFTER_MS) {
          isSpeakingRef.current = false;
          cancelAnimationFrame(rafRef.current);
          const spokenMs = Date.now() - speechStartRef.current;

          if (spokenMs < MIN_SPEECH_MS) {
            if (recorder.state !== "inactive") {
              recorder.onstop = () => { chunksRef.current = []; setTimeout(restartVAD, 100); };
              try { recorder.stop(); } catch { setTimeout(restartVAD, 100); }
            } else setTimeout(restartVAD, 100);
            return;
          }

          setP("transcribing");
          if (recorder.state !== "inactive") {
            recorder.onstop = async () => {
              const mime = recorder.mimeType || "audio/webm";
              const blob = new Blob(chunksRef.current, { type: mime });
              chunksRef.current = [];
              if (blob.size < 200) { restartVAD(); return; }
              try {
                const r = await fetch(`${base}/api/deepgram/transcribe`, {
                  method: "POST",
                  headers: { "Content-Type": mime },
                  credentials: "include",
                  body: blob,
                });
                const { transcript } = await r.json();
                if (transcript?.trim()) await handleUserTurn(transcript.trim());
                else restartVAD();
              } catch { restartVAD(); }
            };
            try { recorder.stop(); } catch { restartVAD(); }
          } else restartVAD();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [handleUserTurn]); // eslint-disable-line

  // ── Open mic ──────────────────────────────────────────────────────────────

  const openMic = useCallback(async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      recorderRef.current = new MediaRecorder(stream, { mimeType: mime });
      restartVAD();
    } catch {
      setChatError("Microphone access denied — type your response below.");
      setP("listening");
    }
  }, [restartVAD]);

  // ── Boot: AI speaks the opening line ─────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const openingMsg: ChatMsg = { role: "ai", text: question };
      setMsg([openingMsg]);
      scrollToBottom();
      setP("ai-speaking");
      await speakText(question);
      await openMic();
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── End session ───────────────────────────────────────────────────────────

  const endSession = useCallback(() => {
    teardownMic();
    setP("ended");
    onComplete(buildTranscript(messagesRef.current));
  }, [teardownMic, onComplete]); // eslint-disable-line

  // ── Text send ─────────────────────────────────────────────────────────────

  const handleTextSend = () => {
    const t = input.trim();
    if (!t || phaseRef.current === "ai-thinking" || phaseRef.current === "ai-speaking" || phaseRef.current === "ended") return;
    cancelAnimationFrame(rafRef.current);
    handleUserTurn(t);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const isAiTurn      = phase === "ai-thinking" || phase === "ai-speaking";
  const isUserSpeaking = phase === "user-speaking";

  const phaseLabel = {
    "ai-speaking":  `${persona.split("—")[0].trim()} is speaking…`,
    "ai-thinking":  `${persona.split("—")[0].trim()} is responding…`,
    "listening":    "Listening — speak when ready",
    "user-speaking":"I hear you…",
    "transcribing": "Processing…",
    "ended":        "Session ended",
  }[phase] ?? "";

  return (
    <div className={`flex flex-col rounded-2xl border overflow-hidden transition-colors duration-500 ${
      isUserSpeaking ? "border-violet-500/50 bg-violet-950/20" : "border-border bg-card"
    }`} style={{ minHeight: 480 }}>

      {/* ── Character hero ── */}
      <div className={`flex flex-col items-center gap-2 pt-5 pb-4 px-4 transition-colors duration-500 ${
        isUserSpeaking ? "bg-violet-950/30" : "bg-gradient-to-b from-muted/40 to-transparent"
      }`}>

        {/* Avatar */}
        <div className="relative flex items-center justify-center w-16 h-16">
          {isAiTurn && (
            <>
              <span className={`absolute inset-0 rounded-full ${styles.pulse} animate-ping`} />
              <span className={`absolute inset-[-6px] rounded-full border ${styles.ring} animate-pulse`} />
            </>
          )}
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${styles.bg} flex items-center justify-center text-2xl shadow-lg select-none transition-all duration-300 ${isAiTurn ? "scale-105" : ""}`}>
            {TONE_EMOJI[tone]}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{persona.split("—")[0].trim()}</p>
          {persona.includes("—") && <p className="text-xs text-muted-foreground">{persona.split("—")[1]?.trim()}</p>}
        </div>

        {/* Waveform */}
        <div className="w-full flex justify-center h-14 items-center">
          {phase === "ai-speaking"
            ? <AiWave waveClass={styles.wave} />
            : <UserWaveform analyserRef={analyserRef} active={isUserSpeaking} color={styles.wave} />}
        </div>

        {/* State pill */}
        {isUserSpeaking ? (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${styles.label}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">Speaking…</span>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            isAiTurn ? "text-muted-foreground" :
            phase === "listening" ? "text-muted-foreground" : "text-muted-foreground"
          }`}>
            {(phase === "ai-thinking" || phase === "transcribing") && <Loader2 className="w-3 h-3 animate-spin" />}
            {phase === "listening" && (
              <span className="relative flex w-2 h-2 mr-0.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
              </span>
            )}
            {phaseLabel}
          </div>
        )}
      </div>

      {/* ── Transcript ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
              msg.role === "ai"
                ? `bg-gradient-to-br ${styles.bg}`
                : "bg-muted border border-border"
            }`}>
              {msg.role === "ai" ? TONE_EMOJI[tone] : <User className="w-3 h-3 text-muted-foreground" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === "ai"
                ? "bg-muted/60 border border-border text-foreground rounded-tl-sm"
                : "bg-primary/10 border border-primary/20 text-foreground rounded-tr-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {phase === "ai-thinking" && (
          <div className="flex gap-2.5">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${styles.bg} flex items-center justify-center text-xs shrink-0`}>{TONE_EMOJI[tone]}</div>
            <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
              {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}

        {chatError && (
          <p className="text-xs text-red-400 text-center bg-red-500/10 rounded-lg p-2">
            {chatError} — <button className="underline" onClick={() => { setChatError(null); restartVAD(); }}>retry</button>
          </p>
        )}
      </div>

      {/* ── Input + End button ── */}
      {phase !== "ended" && (
        <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
              placeholder={isAiTurn ? "Wait for them to finish…" : "Or type a response instead…"}
              disabled={isAiTurn || phase === "transcribing"}
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground disabled:opacity-40 max-h-20 overflow-y-auto"
            />
            <button
              type="button"
              onClick={handleTextSend}
              disabled={!input.trim() || isAiTurn}
              className="w-9 h-9 rounded-xl shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-30 text-primary-foreground flex items-center justify-center transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Auto-listening · pause to send · or type + Enter
            </p>
            {userTurns >= 2 && (
              <button
                type="button"
                onClick={endSession}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors"
              >
                <PhoneOff className="w-3 h-3" />
                End conversation
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "ended" && (
        <div className="px-4 py-3 border-t border-border text-center">
          <p className="text-xs text-emerald-400 font-medium">Conversation recorded ✓ — scroll up to review, then continue.</p>
        </div>
      )}
    </div>
  );
}
