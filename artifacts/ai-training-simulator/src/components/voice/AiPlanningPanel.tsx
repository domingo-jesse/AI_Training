import {
  useState, useEffect, useRef, useCallback, useMemo
} from "react";
import {
  X, Sparkles, Send, Loader2, Wand2, ChevronDown,
  CheckCircle2, AlertCircle, MessageSquare, Zap, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
  questionText: string; expectedAnswer: string; maxPoints: number;
  questionType: string; rubric: string; aiRoleOrPersona: string;
  aiConversationPrompt: string; evaluationFocus: string;
}
interface GeneratedModule {
  title: string; category: string; difficulty: string; description: string;
  estimatedTime: string; learningObjectives: string; scenarioTicket: string;
  scenarioContext: string; hiddenRootCause: string; expectedDiagnosis: string;
  expectedReasoningPath: string; expectedNextSteps: string; lessonTakeaway: string;
  llmScoringEnabled: boolean; llmGraderInstructions: string; questions: Question[];
}
interface AiPlanningPanelProps {
  onGenerated: (module: GeneratedModule) => void;
  onClose: () => void;
}
type Mode = "quick" | "conversation";
interface ChatMessage { role: "user" | "assistant"; content: string; }

// ─────────────────────────────────────────────────────────────────────────────
// VAD constants
// ─────────────────────────────────────────────────────────────────────────────

const SPEECH_THRESHOLD = 18;   // RMS out of 255 — above = speech detected
const SILENCE_AFTER_MS = 1400; // ms of quiet after speech → auto-send
const MIN_SPEECH_MS    = 350;  // must have spoken for at least this long

// ─────────────────────────────────────────────────────────────────────────────
// Waveform visualiser
// ─────────────────────────────────────────────────────────────────────────────

/** Animated bars driven by real analyser data (user) or CSS keyframes (AI). */
function WaveformBars({
  mode,
  analyserRef,
}: {
  mode: "user" | "ai" | "idle";
  analyserRef?: React.RefObject<AnalyserNode | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const BAR_COUNT = 28;

  useEffect(() => {
    if (mode !== "user" || !analyserRef?.current || !canvasRef.current) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const analyser = analyserRef.current;
    const canvas   = canvasRef.current;
    const ctx      = canvas.getContext("2d")!;
    const data     = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const step = Math.floor(data.length / BAR_COUNT);
      const barW = canvas.width / BAR_COUNT - 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        const val    = data[i * step] / 255;
        const height = Math.max(4, val * canvas.height);
        const y      = (canvas.height - height) / 2;
        ctx.fillStyle = `rgba(99,102,241,${0.4 + val * 0.6})`; // indigo
        ctx.beginPath();
        ctx.roundRect(i * (barW + 2), y, barW, height, 3);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, analyserRef]);

  if (mode === "user") {
    return (
      <canvas
        ref={canvasRef}
        width={240}
        height={56}
        className="w-60 h-14"
      />
    );
  }

  // AI speaking — CSS animated bars
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => i);
  return (
    <div className="flex items-center gap-[3px] h-14 w-60">
      {bars.map(i => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-violet-400"
          style={{
            animation: `nova-wave 0.9s ease-in-out ${(i % 7) * 0.12}s infinite alternate`,
            minHeight: 4,
          }}
        />
      ))}
      <style>{`
        @keyframes nova-wave {
          from { height: 6px;  opacity: 0.35; }
          to   { height: 48px; opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nova avatar
// ─────────────────────────────────────────────────────────────────────────────

function NovaAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <span className="absolute inset-[-6px] rounded-full border border-violet-500/30 animate-pulse" />
        </>
      )}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl select-none shadow-lg transition-all duration-300 ${
        speaking
          ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/40"
          : "bg-gradient-to-br from-violet-700 to-indigo-800"
      }`}>
        🎓
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS helper
// ─────────────────────────────────────────────────────────────────────────────

async function speakText(text: string): Promise<void> {
  const res = await fetch(`${basePath}/api/deepgram/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text: text.slice(0, 800) }), // keep TTS snappy
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  return new Promise<void>(resolve => {
    const audio  = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play().catch(() => resolve());
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation mode
// ─────────────────────────────────────────────────────────────────────────────

type ConvPhase =
  | "booting"        // fetching first AI message
  | "listening"      // mic open, VAD watching — no speech yet
  | "user-speaking"  // VAD detected speech, recording in progress
  | "transcribing"   // silence detected, sending to Deepgram STT
  | "ai-thinking"    // waiting for plan-chat response
  | "ai-speaking"    // TTS playing
  | "done";          // module generated

function ConversationMode({ onGenerated }: { onGenerated: (m: GeneratedModule) => void }) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [phase,     setPhase]     = useState<ConvPhase>("booting");
  const [input,     setInput]     = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // VAD internals (all in refs — no re-renders needed)
  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const rafRef         = useRef<number>(0);
  const lastSpeechRef  = useRef<number>(0);
  const speechStartRef = useRef<number>(0);
  const isSpeakingRef  = useRef(false); // VAD "is user currently speaking?"
  const phaseRef       = useRef<ConvPhase>("booting"); // mirror for RAF loop

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const scrollToBottom = () =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );

  // ── Tear down mic / VAD ──────────────────────────────────────────────────

  const teardownMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    recorderRef.current = null;
    streamRef.current   = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    isSpeakingRef.current = false;
    chunksRef.current = [];
  }, []);

  // ── Send a user message to plan-chat ─────────────────────────────────────

  const sendToAI = useCallback(async (userText: string, currentMessages: ChatMessage[]) => {
    const userMsg: ChatMessage = { role: "user", content: userText };
    const history = [...currentMessages, userMsg];
    setMessages(history);
    setInput("");
    scrollToBottom();
    setPhase("ai-thinking");
    setChatError(null);

    try {
      const res = await fetch(`${basePath}/api/modules/plan-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Chat failed");
      const data = await res.json();

      const aiMsg: ChatMessage = { role: "assistant", content: data.message };
      const next = [...history, aiMsg];
      setMessages(next);
      scrollToBottom();

      if (data.done && data.module) {
        setPhase("ai-speaking");
        await speakText(data.message);
        setPhase("done");
        setTimeout(() => onGenerated(data.module), 600);
        return;
      }

      // Speak Nova's reply, then re-open mic
      setPhase("ai-speaking");
      await speakText(data.message);
      setPhase("listening");
    } catch (err: any) {
      setChatError(err.message ?? "Something went wrong");
      setPhase("listening");
    }
  }, [onGenerated]); // eslint-disable-line

  // ── VAD loop ──────────────────────────────────────────────────────────────

  const startVAD = useCallback((msgs: ChatMessage[]) => {
    if (!analyserRef.current || !recorderRef.current) return;
    const analyser  = analyserRef.current;
    const recorder  = recorderRef.current;
    const data      = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const p = phaseRef.current;
      if (p !== "listening" && p !== "user-speaking") return; // stopped

      analyser.getByteFrequencyData(data);
      const rms = data.reduce((s, v) => s + v, 0) / data.length;

      if (rms > SPEECH_THRESHOLD) {
        lastSpeechRef.current = Date.now();
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          speechStartRef.current = Date.now();
          if (recorder.state === "inactive") {
            chunksRef.current = [];
            recorder.start(100);
          }
          setPhase("user-speaking");
        }
      } else if (isSpeakingRef.current) {
        const silent = Date.now() - lastSpeechRef.current;
        if (silent >= SILENCE_AFTER_MS) {
          // Enough silence — stop and transcribe
          isSpeakingRef.current = false;
          const spokenMs = Date.now() - speechStartRef.current;
          cancelAnimationFrame(rafRef.current);

          if (spokenMs < MIN_SPEECH_MS) {
            // Too short — probably a sound artefact, reset
            try { recorder.stop(); } catch {}
            chunksRef.current = [];
            setTimeout(() => {
              if (recorderRef.current) {
                try {
                  chunksRef.current = [];
                  recorderRef.current.start(100);
                } catch {}
              }
              isSpeakingRef.current = false;
              setPhase("listening");
              rafRef.current = requestAnimationFrame(loop);
            }, 200);
            return;
          }

          // Real speech — transcribe
          setPhase("transcribing");
          recorder.onstop = async () => {
            const mimeType = recorder.mimeType || "audio/webm";
            const blob = new Blob(chunksRef.current, { type: mimeType });
            chunksRef.current = [];
            if (blob.size < 200) { setPhase("listening"); startVAD(msgs); return; }

            try {
              const r = await fetch(`${basePath}/api/deepgram/transcribe`, {
                method: "POST",
                headers: { "Content-Type": mimeType },
                credentials: "include",
                body: blob,
              });
              const { transcript } = await r.json();
              if (transcript?.trim()) {
                await sendToAI(transcript.trim(), msgs);
              } else {
                setPhase("listening");
                startVAD(msgs);
              }
            } catch {
              setPhase("listening");
              startVAD(msgs);
            }
          };
          try { recorder.stop(); } catch {}
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [sendToAI]); // eslint-disable-line

  // ── Open mic & start VAD ──────────────────────────────────────────────────

  const openMic = useCallback(async (msgs: ChatMessage[]) => {
    try {
      if (streamRef.current) teardownMic();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorderRef.current = recorder;

      isSpeakingRef.current = false;
      setPhase("listening");
      startVAD(msgs);
    } catch {
      setChatError("Microphone access denied. Type your response below.");
      setPhase("listening");
    }
  }, [teardownMic, startVAD]);

  // ── Boot: fetch first message ─────────────────────────────────────────────

  const boot = useCallback(async () => {
    setPhase("ai-thinking");
    try {
      const res = await fetch(`${basePath}/api/modules/plan-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: [] }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = { role: "assistant", content: data.message };
      setMessages([aiMsg]);
      scrollToBottom();
      setPhase("ai-speaking");
      await speakText(data.message);
      await openMic([aiMsg]);
    } catch (err: any) {
      setChatError(err.message ?? "Failed to start");
      setPhase("listening");
    }
  }, [openMic]); // eslint-disable-line

  useEffect(() => {
    boot();
    return () => teardownMic();
  }, []); // eslint-disable-line

  // After AI finishes speaking & phase returns to "listening", re-open mic on
  // subsequent turns (already handled in sendToAI → openMic chain above)
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Manual text send ──────────────────────────────────────────────────────

  const handleTextSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || phase === "ai-thinking" || phase === "ai-speaking" || phase === "done") return;
    teardownMic();
    sendToAI(trimmed, messages).then(() => {
      // re-open mic after AI replies (sendToAI sets phase to "listening")
    });
  }, [input, phase, messages, teardownMic, sendToAI]);

  // ── Phase label ──────────────────────────────────────────────────────────

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case "booting":      return "Nova is warming up…";
      case "listening":    return "Listening… speak when ready";
      case "user-speaking":return "I'm hearing you…";
      case "transcribing": return "Got it, processing…";
      case "ai-thinking":  return "Nova is thinking…";
      case "ai-speaking":  return "Nova is speaking…";
      case "done":         return "Building your module…";
    }
  }, [phase]);

  const isAiTurn  = phase === "ai-thinking" || phase === "ai-speaking" || phase === "booting";
  const isUserTurn = phase === "listening" || phase === "user-speaking";

  const waveMode: "user" | "ai" | "idle" =
    phase === "user-speaking" ? "user" :
    phase === "ai-speaking"   ? "ai"   : "idle";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Nova hero area ── */}
      <div className="flex flex-col items-center gap-3 pt-6 pb-4 px-5 border-b border-border/50 shrink-0 bg-gradient-to-b from-violet-950/20 to-transparent">
        <NovaAvatar speaking={phase === "ai-speaking"} />

        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Nova</p>
          <p className="text-xs text-muted-foreground">AI Training Consultant</p>
        </div>

        {/* Waveform */}
        <div className="h-14 flex items-center justify-center">
          {waveMode !== "idle"
            ? <WaveformBars mode={waveMode} analyserRef={analyserRef} />
            : (
              <div className="flex items-center gap-[3px] h-14 w-60">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-border" style={{ height: 6 }} />
                ))}
              </div>
            )
          }
        </div>

        {/* Phase label */}
        <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${
          isAiTurn   ? "text-violet-400" :
          phase === "user-speaking" ? "text-indigo-400" :
          isUserTurn ? "text-muted-foreground" : "text-emerald-400"
        }`}>
          {(phase === "ai-thinking" || phase === "transcribing" || phase === "booting") && (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          {phase === "user-speaking" && (
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          )}
          {phaseLabel}
        </div>
      </div>

      {/* ── Transcript ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
              msg.role === "assistant"
                ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white"
                : "bg-muted border border-border"
            }`}>
              {msg.role === "assistant" ? "🎓" : <User className="w-3 h-3 text-muted-foreground" />}
            </div>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === "assistant"
                ? "bg-violet-500/10 border border-violet-500/20 text-foreground rounded-tl-sm"
                : "bg-muted text-foreground rounded-tr-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {phase === "ai-thinking" && messages.length > 0 && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs shrink-0">🎓</div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Populating your module…
          </div>
        )}

        {chatError && (
          <div className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {chatError} —{" "}
            <button className="underline" onClick={() => { setChatError(null); openMic(messages); }}>
              retry
            </button>
          </div>
        )}
      </div>

      {/* ── Text fallback ── */}
      {phase !== "done" && (
        <div className="px-5 py-3 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
              placeholder={isAiTurn ? "Nova is talking…" : "Or type a response…"}
              disabled={phase === "ai-thinking" || phase === "ai-speaking" || phase === "done" || phase === "booting"}
              rows={1}
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-muted-foreground disabled:opacity-40 max-h-24 overflow-y-auto"
            />
            <button
              type="button"
              onClick={handleTextSend}
              disabled={!input.trim() || isAiTurn || phase === "done"}
              className="w-9 h-9 rounded-xl shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            Nova listens automatically · or type and press Enter
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Generate mode (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const EXAMPLE_PROMPTS = [
  "A customer service scenario about handling an angry customer who received the wrong order",
  "A technical support simulation for diagnosing network connectivity issues in a remote office",
  "A sales roleplay where a prospect objects to pricing and wants to cancel",
  "A compliance training scenario for handling a data privacy request under GDPR",
  "A manager coaching a team member who missed their performance targets",
];

function QuickMode({ onGenerated }: { onGenerated: (m: GeneratedModule) => void }) {
  const [prompt, setPrompt]               = useState("");
  const [difficulty, setDifficulty]       = useState("intermediate");
  const [questionCount, setQuestionCount] = useState(3);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [genError, setGenError]           = useState<string | null>(null);
  const [showExamples, setShowExamples]   = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true); setGenError(null);
    try {
      const r = await fetch(`${basePath}/api/modules/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: prompt.trim(), difficulty, questionCount }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Generation failed");
      onGenerated(await r.json());
    } catch (e: any) {
      setGenError(e.message ?? "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 flex flex-col">
      <div className="space-y-2">
        <Label className="text-sm font-medium">What is this module about? *</Label>
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. A customer service scenario where a customer is frustrated about a billing error…"
          rows={5}
          className="resize-none"
          disabled={isGenerating}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
        />
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowExamples(o => !o)}
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? "rotate-180" : ""}`} />
          Show example prompts
        </button>
        {showExamples && (
          <div className="space-y-1.5 pt-1">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setPrompt(ex); setShowExamples(false); textareaRef.current?.focus(); }}
                className="w-full text-left text-xs px-3 py-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Difficulty</Label>
          <SelectField value={difficulty} onChange={setDifficulty} options={[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
          ]} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Questions</Label>
          <SelectField
            value={String(questionCount)}
            onChange={v => setQuestionCount(Number(v))}
            options={[1,2,3,4,5,6,7,8].map(n => ({ value: String(n), label: String(n) }))}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What gets generated</p>
        <ul className="space-y-1">
          {[
            "Title, category, description, objectives",
            "Full scenario with context, ticket & background",
            "Hidden root cause + expected diagnosis & reasoning",
            `${questionCount} graded question${questionCount !== 1 ? "s" : ""} with rubrics`,
            "AI grader instructions for automatic scoring",
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {genError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{genError}</p>
        </div>
      )}

      <div className="flex-1" />

      <div className="pt-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        >
          {isGenerating
            ? <span className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Generating module…</span>
            : <span className="flex items-center gap-2"><Wand2 className="w-4 h-4" />Generate Module</span>}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Takes 10–20 seconds · ⌘+Enter · Edit everything after
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────

export function AiPlanningPanel({ onGenerated, onClose }: AiPlanningPanelProps) {
  const [mode, setMode] = useState<Mode>("quick");

  const handleGenerated = useCallback((module: GeneratedModule) => {
    onGenerated(module);
  }, [onGenerated]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-lg bg-background border-l border-border flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-gradient-to-r from-violet-950/40 to-background">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">Create Module with AI</h2>
              <p className="text-xs text-muted-foreground">Pick your style</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              mode === "quick"
                ? "border-violet-500 text-violet-400 bg-violet-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Quick Generate
          </button>
          <button
            type="button"
            onClick={() => setMode("conversation")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              mode === "conversation"
                ? "border-violet-500 text-violet-400 bg-violet-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Talk to Nova
          </button>
        </div>

        {/* Mode hint */}
        <div className="px-5 py-2 bg-muted/20 border-b border-border/50 shrink-0">
          {mode === "quick"
            ? <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Quick:</span> Describe your scenario once and generate instantly.</p>
            : <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Nova</span> listens, asks follow-up questions, and builds a deep module with you.</p>}
        </div>

        {/* Mode content — key forces remount when switching so Nova's mic is torn down */}
        {mode === "quick"
          ? <QuickMode key="quick" onGenerated={handleGenerated} />
          : <ConversationMode key="conversation" onGenerated={handleGenerated} />}
      </div>
    </div>
  );
}
