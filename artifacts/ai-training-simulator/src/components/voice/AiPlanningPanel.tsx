import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Sparkles, Send, Loader2, Wand2, ChevronDown,
  CheckCircle2, AlertCircle, MessageSquare, Zap, User,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// Types
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
interface ChatMessage { role: "user" | "assistant"; content: string; }
type Mode = "quick" | "conversation";
type ConvPhase =
  | "booting" | "listening" | "user-speaking"
  | "transcribing" | "ai-thinking" | "ai-speaking" | "done";

// ─────────────────────────────────────────────────────────────────────────────
// VAD config
// ─────────────────────────────────────────────────────────────────────────────

const SPEECH_THRESHOLD = 12;   // avg freq energy (0-255) above = speech
const SILENCE_AFTER_MS = 1500; // ms of quiet after speech → stop
const MIN_SPEECH_MS    = 400;  // discard clips shorter than this

// ─────────────────────────────────────────────────────────────────────────────
// TTS helper
// ─────────────────────────────────────────────────────────────────────────────

async function speakText(text: string): Promise<void> {
  const res = await fetch(`${basePath}/api/deepgram/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text: text.slice(0, 800) }),
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
// Nova avatar — pulses while speaking
// ─────────────────────────────────────────────────────────────────────────────

function NovaAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-violet-500/25 animate-ping" />
          <span className="absolute inset-[-8px] rounded-full border-2 border-violet-400/30 animate-pulse" />
        </>
      )}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl select-none shadow-xl transition-all duration-300 ${
        speaking
          ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/50 scale-105"
          : "bg-gradient-to-br from-violet-700 to-indigo-800"
      }`}>
        🎓
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User speaking indicator — shown when VAD detects voice
// ─────────────────────────────────────────────────────────────────────────────

function UserSpeakingRing({ analyserRef, active }: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
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
    const W = canvas.width;
    const H = canvas.height;
    const BAR_COUNT = 40;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, W, H);

      const step = Math.floor(data.length / BAR_COUNT);
      const barW = W / BAR_COUNT - 1.5;
      for (let i = 0; i < BAR_COUNT; i++) {
        const val    = data[i * step] / 255;
        const h      = Math.max(3, val * H * 0.95);
        const y      = (H - h) / 2;
        // gradient from indigo to violet based on intensity
        const alpha  = 0.5 + val * 0.5;
        ctx.fillStyle = `rgba(129,140,248,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(i * (barW + 1.5), y, barW, h, 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={64}
      className="w-full max-w-[300px] h-16"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI speaking — CSS wave bars
// ─────────────────────────────────────────────────────────────────────────────

function AiSpeakingWave() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 w-full max-w-[300px]">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-violet-400"
          style={{
            animation: `nova-bar 0.8s ease-in-out ${(i % 8) * 0.1}s infinite alternate`,
            minHeight: 3,
          }}
        />
      ))}
      <style>{`
        @keyframes nova-bar {
          from { height: 4px;  opacity: 0.3; }
          to   { height: 52px; opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation mode
// ─────────────────────────────────────────────────────────────────────────────

function ConversationMode({ onGenerated }: { onGenerated: (m: GeneratedModule) => void }) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [phase,     setPhase]     = useState<ConvPhase>("booting");
  const [input,     setInput]     = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  // Refs — never go stale in closures
  const messagesRef    = useRef<ChatMessage[]>([]);   // always current messages
  const phaseRef       = useRef<ConvPhase>("booting");
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
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // Keep refs in sync with state
  const setMessagesSync = (msgs: ChatMessage[]) => {
    messagesRef.current = msgs;
    setMessages(msgs);
  };
  const setPhaseSync = (p: ConvPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const scrollToBottom = () =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );

  // ── Teardown ───────────────────────────────────────────────────────────────

  const stopVADLoop = () => cancelAnimationFrame(rafRef.current);

  const teardownMic = useCallback(() => {
    stopVADLoop();
    if (recorderRef.current?.state !== "inactive") {
      try { recorderRef.current!.stop(); } catch {}
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

  // ── Core chat call ─────────────────────────────────────────────────────────

  const callPlanChat = async (history: ChatMessage[]): Promise<{ message: string; done: boolean; module?: GeneratedModule }> => {
    const res = await fetch(`${basePath}/api/modules/plan-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Chat failed");
    return res.json();
  };

  // ── Restart VAD loop after recorder is in "inactive" state ────────────────

  const restartVADLoop = useCallback(() => {
    const recorder = recorderRef.current;
    const analyser = analyserRef.current;
    if (!recorder || !analyser) return;

    isSpeakingRef.current = false;
    chunksRef.current     = [];

    // Recorder must be inactive before we can start again
    if (recorder.state !== "inactive") return;

    setPhaseSync("listening");

    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const p = phaseRef.current;
      if (p !== "listening" && p !== "user-speaking") return; // phase changed externally — stop

      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;

      if (avg > SPEECH_THRESHOLD) {
        lastSpeechRef.current = Date.now();

        if (!isSpeakingRef.current) {
          // Speech just started
          isSpeakingRef.current  = true;
          speechStartRef.current = Date.now();
          chunksRef.current      = [];
          if (recorder.state === "inactive") {
            recorder.ondataavailable = e => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            try { recorder.start(80); } catch {}
          }
          setPhaseSync("user-speaking");
        }
      } else if (isSpeakingRef.current) {
        const silentMs = Date.now() - lastSpeechRef.current;
        if (silentMs >= SILENCE_AFTER_MS) {
          // Silence long enough — finalize
          isSpeakingRef.current = false;
          stopVADLoop();
          const spokenMs = Date.now() - speechStartRef.current;

          if (spokenMs < MIN_SPEECH_MS) {
            // Too short — noise, reset
            if (recorder.state !== "inactive") {
              recorder.onstop = () => {
                chunksRef.current = [];
                setTimeout(() => restartVADLoop(), 100);
              };
              try { recorder.stop(); } catch { setTimeout(() => restartVADLoop(), 100); }
            } else {
              setTimeout(() => restartVADLoop(), 100);
            }
            return;
          }

          // Real speech — stop recorder, collect blob, transcribe
          setPhaseSync("transcribing");
          if (recorder.state !== "inactive") {
            recorder.onstop = async () => {
              const mimeType = recorder.mimeType || "audio/webm";
              const blob     = new Blob(chunksRef.current, { type: mimeType });
              chunksRef.current = [];

              if (blob.size < 200) { restartVADLoop(); return; }

              try {
                const r = await fetch(`${basePath}/api/deepgram/transcribe`, {
                  method: "POST",
                  headers: { "Content-Type": mimeType },
                  credentials: "include",
                  body: blob,
                });
                const { transcript } = await r.json();
                if (transcript?.trim()) {
                  await handleUserTurn(transcript.trim());
                } else {
                  restartVADLoop();
                }
              } catch {
                restartVADLoop();
              }
            };
            try { recorder.stop(); } catch { restartVADLoop(); }
          } else {
            restartVADLoop();
          }
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []); // eslint-disable-line

  // ── Handle a complete user utterance ──────────────────────────────────────

  const handleUserTurn = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messagesRef.current, userMsg];
    setMessagesSync(history);
    setInput("");
    scrollToBottom();
    setPhaseSync("ai-thinking");
    setChatError(null);

    try {
      const data = await callPlanChat(history);
      const aiMsg: ChatMessage = { role: "assistant", content: data.message };
      const next = [...history, aiMsg];
      setMessagesSync(next);
      scrollToBottom();

      if (data.done && data.module) {
        setPhaseSync("ai-speaking");
        await speakText(data.message);
        setPhaseSync("done");
        setTimeout(() => onGenerated(data.module!), 600);
        return;
      }

      setPhaseSync("ai-speaking");
      await speakText(data.message);

      // ← FIX: restart VAD loop here, using current messagesRef (not a stale snapshot)
      restartVADLoop();
    } catch (err: any) {
      setChatError(err.message ?? "Something went wrong");
      restartVADLoop();
    }
  }, [onGenerated, restartVADLoop]); // eslint-disable-line

  // ── Open mic for the first time ───────────────────────────────────────────

  const openMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512; // higher res for better VAD
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      recorderRef.current = new MediaRecorder(stream, { mimeType });

      restartVADLoop();
    } catch {
      setChatError("Microphone access denied — type your response below.");
      setPhaseSync("listening");
    }
  }, [restartVADLoop]);

  // ── Boot ──────────────────────────────────────────────────────────────────

  const boot = useCallback(async () => {
    setPhaseSync("ai-thinking");
    try {
      const data = await callPlanChat([]);
      const aiMsg: ChatMessage = { role: "assistant", content: data.message };
      setMessagesSync([aiMsg]);
      scrollToBottom();
      setPhaseSync("ai-speaking");
      await speakText(data.message);
      await openMic();
    } catch (err: any) {
      setChatError(err.message ?? "Failed to start — type below to continue.");
      setPhaseSync("listening");
    }
  }, [openMic]); // eslint-disable-line

  useEffect(() => {
    boot();
    return () => teardownMic();
  }, []); // eslint-disable-line

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Manual text send ──────────────────────────────────────────────────────

  const handleTextSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || phaseRef.current === "ai-thinking" || phaseRef.current === "ai-speaking" || phaseRef.current === "done") return;
    stopVADLoop();
    handleUserTurn(trimmed);
  }, [input, handleUserTurn]);

  // ── Derived display ───────────────────────────────────────────────────────

  const isAiTurn      = phase === "ai-thinking" || phase === "ai-speaking" || phase === "booting";
  const isUserSpeaking = phase === "user-speaking";

  const phaseLabel = (() => {
    switch (phase) {
      case "booting":       return "Nova is warming up…";
      case "listening":     return "Listening — speak when ready";
      case "user-speaking": return "I hear you, keep going…";
      case "transcribing":  return "Got it, processing…";
      case "ai-thinking":   return "Nova is thinking…";
      case "ai-speaking":   return "Nova is speaking…";
      case "done":          return "Building your module…";
    }
  })();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Nova hero ── */}
      <div className={`flex flex-col items-center gap-3 pt-5 pb-4 px-5 border-b shrink-0 transition-colors duration-500 ${
        isUserSpeaking
          ? "border-indigo-500/40 bg-indigo-950/30"
          : "border-border/50 bg-gradient-to-b from-violet-950/20 to-transparent"
      }`}>
        <NovaAvatar speaking={phase === "ai-speaking"} />

        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Nova</p>
          <p className="text-xs text-muted-foreground">AI Training Consultant</p>
        </div>

        {/* Waveform area */}
        <div className="w-full flex justify-center h-16 items-center">
          {phase === "ai-speaking"
            ? <AiSpeakingWave />
            : <UserSpeakingRing analyserRef={analyserRef} active={isUserSpeaking} />
          }
        </div>

        {/* ── Prominent user-speaking state ── */}
        {isUserSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/40">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm font-semibold text-indigo-300 tracking-wide">Speaking…</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        {/* Phase label (not shown when user is speaking — pill covers it) */}
        {!isUserSpeaking && (
          <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${
            isAiTurn           ? "text-violet-400" :
            phase === "done"   ? "text-emerald-400" :
            phase === "transcribing" ? "text-primary" :
            "text-muted-foreground"
          }`}>
            {(phase === "ai-thinking" || phase === "transcribing" || phase === "booting") && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {phase === "listening" && (
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
              </span>
            )}
            {phaseLabel}
          </div>
        )}
      </div>

      {/* ── Transcript ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === "assistant"
                ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white text-xs"
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
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex items-center justify-center gap-2 py-4 text-emerald-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Populating your module…
          </div>
        )}

        {chatError && (
          <div className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {chatError} —{" "}
            <button className="underline" onClick={() => { setChatError(null); restartVADLoop(); }}>
              retry mic
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
              placeholder={isAiTurn ? "Nova is talking…" : "Or type a response instead…"}
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
            Nova listens automatically · pause to send · or type + Enter
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Generate mode
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
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          {isGenerating
            ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Generating module…</>
            : <><Wand2 className="w-4 h-4" />Generate Module</>}
        </button>
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
          {([
            { id: "quick", icon: <Zap className="w-3.5 h-3.5" />, label: "Quick Generate" },
            { id: "conversation", icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Talk to Nova" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                mode === tab.id
                  ? "border-violet-500 text-violet-400 bg-violet-500/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Mode hint */}
        <div className="px-5 py-2 bg-muted/20 border-b border-border/50 shrink-0">
          {mode === "quick"
            ? <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Quick:</span> Describe once and generate instantly.</p>
            : <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Nova</span> listens automatically — just speak. Pause when done and she'll respond.</p>}
        </div>

        {/* Content — key forces remount on tab switch so mic is torn down cleanly */}
        {mode === "quick"
          ? <QuickMode key="quick" onGenerated={handleGenerated} />
          : <ConversationMode key="conversation" onGenerated={handleGenerated} />}
      </div>
    </div>
  );
}
