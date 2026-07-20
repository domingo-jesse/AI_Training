import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Sparkles, Mic, MicOff, Send, Loader2, Volume2, VolumeX,
  Bot, User, Wand2, ChevronDown, CheckCircle2, AlertCircle,
  MessageSquare, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useVoice } from "@/hooks/useVoice";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Shared types ──────────────────────────────────────────────────────────────

interface Question {
  questionText: string;
  expectedAnswer: string;
  maxPoints: number;
  questionType: string;
  rubric: string;
  aiRoleOrPersona: string;
  aiConversationPrompt: string;
  evaluationFocus: string;
}

interface GeneratedModule {
  title: string; category: string; difficulty: string; description: string;
  estimatedTime: string; learningObjectives: string; scenarioTicket: string;
  scenarioContext: string; hiddenRootCause: string; expectedDiagnosis: string;
  expectedReasoningPath: string; expectedNextSteps: string; lessonTakeaway: string;
  llmScoringEnabled: boolean; llmGraderInstructions: string;
  questions: Question[];
}

interface AiPlanningPanelProps {
  onGenerated: (module: GeneratedModule) => void;
  onClose: () => void;
}

type Mode = "quick" | "conversation";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Quick Generate mode ───────────────────────────────────────────────────────

function QuickMode({ onGenerated }: { onGenerated: (m: GeneratedModule) => void }) {
  const [prompt, setPrompt] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [questionCount, setQuestionCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const r = await fetch(`${basePath}/api/modules/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: prompt.trim(), difficulty, questionCount }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error ?? "Generation failed");
      }
      onGenerated(await r.json());
    } catch (e: any) {
      setGenError(e.message ?? "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 flex flex-col">
      {/* Prompt */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">What is this module about? *</Label>
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. A customer service scenario where a customer is frustrated about a billing error and wants a refund…"
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

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Difficulty</Label>
          <SelectField
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Questions</Label>
          <SelectField
            value={String(questionCount)}
            onChange={v => setQuestionCount(Number(v))}
            options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) }))}
          />
        </div>
      </div>

      {/* What's generated */}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate button */}
      <div className="pt-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Generating module…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Generate Module
            </span>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Takes 10–20 seconds · ⌘+Enter to generate · Edit everything after
        </p>
      </div>
    </div>
  );
}

// ── Conversation mode ─────────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string; }

function ConversationMode({ onGenerated }: { onGenerated: (m: GeneratedModule) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const MAX_TURNS = 5;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const voice     = useVoice();

  const scrollToBottom = () =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );

  const chat = useCallback(async (history: ChatMessage[]) => {
    setIsThinking(true);
    setChatError(null);
    try {
      const res = await fetch(`${basePath}/api/modules/plan-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Chat failed");
      }
      const data = await res.json();
      const aiMsg: ChatMessage = { role: "assistant", content: data.message };
      const next = [...history, aiMsg];
      setMessages(next);
      scrollToBottom();
      voice.speak(data.message).catch(() => {});
      if (data.done && data.module) {
        setIsDone(true);
        setTimeout(() => onGenerated(data.module), 800);
      }
    } catch (err: any) {
      setChatError(err.message ?? "Something went wrong");
    } finally {
      setIsThinking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGenerated]);

  useEffect(() => { chat([]); }, []); // eslint-disable-line
  useEffect(scrollToBottom, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking || isDone) return;
    voice.cancelSpeak();
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setTurnCount(t => t + 1);
    scrollToBottom();
    await chat(next);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [messages, isThinking, isDone, chat, voice]); // eslint-disable-line

  const handleMicClick = async () => {
    if (voice.isRecording) {
      const transcript = await voice.stopRecording();
      if (transcript) await send(transcript);
    } else {
      voice.cancelSpeak();
      await voice.startRecording();
    }
  };

  const dots = Array.from({ length: MAX_TURNS }, (_, i) => i < turnCount);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Speaker control + progress */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-muted-foreground mr-1">Progress</span>
          {dots.map((filled, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${filled ? "bg-violet-500" : "bg-border"}`} />
          ))}
          {isDone && <span className="text-xs text-emerald-400 font-medium ml-1">Done!</span>}
        </div>
        <button
          type="button"
          onClick={() => voice.status === "speaking" ? voice.cancelSpeak() : undefined}
          title={voice.status === "speaking" ? "Stop speaking" : "AI speaks automatically"}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
            voice.status === "speaking" ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {voice.status === "speaking" ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !isThinking && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === "assistant"
                ? "bg-violet-500/20 border border-violet-500/30"
                : "bg-muted border border-border"
            }`}>
              {msg.role === "assistant"
                ? <Bot className="w-3.5 h-3.5 text-violet-400" />
                : <User className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "assistant"
                ? "bg-violet-500/10 border border-violet-500/20 text-foreground rounded-tl-sm"
                : "bg-muted text-foreground rounded-tr-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {isDone && (
          <div className="flex items-center justify-center gap-2 py-4 text-emerald-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Populating your module…
          </div>
        )}

        {chatError && (
          <div className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {chatError} —{" "}
            <button className="underline" onClick={() => chat(messages)}>retry</button>
          </div>
        )}
      </div>

      {/* Input area */}
      {!isDone && (
        <div className="px-5 py-4 border-t border-border shrink-0">
          {(voice.isRecording || voice.status === "transcribing") && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              {voice.status === "transcribing"
                ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                : <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-xs text-red-400 font-medium">
                {voice.status === "transcribing" ? "Transcribing…" : "Recording — tap mic to stop"}
              </span>
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Mic */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isThinking || voice.status === "transcribing"}
              className={[
                "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all focus:outline-none",
                voice.isRecording
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : isThinking || voice.status === "transcribing"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-violet-500/15 hover:bg-violet-500/25 text-violet-400",
              ].join(" ")}
              title={voice.isRecording ? "Stop recording" : "Speak your answer"}
            >
              {voice.status === "transcribing"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : voice.isRecording
                ? <MicOff className="w-4 h-4" />
                : <Mic className="w-4 h-4" />}
              {voice.isRecording && (
                <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-50 pointer-events-none" />
              )}
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={isThinking ? "AI is thinking…" : "Type or speak…"}
              disabled={isThinking || voice.isRecording || voice.status === "transcribing"}
              rows={1}
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-muted-foreground disabled:opacity-50 max-h-32 overflow-y-auto"
            />

            {/* Send */}
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || isThinking || voice.isRecording}
              className="w-10 h-10 rounded-xl shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Enter to send · Shift+Enter for new line · Or just speak
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AiPlanningPanel({ onGenerated, onClose }: AiPlanningPanelProps) {
  const [mode, setMode] = useState<Mode>("quick");

  const handleGenerated = useCallback((module: GeneratedModule) => {
    onGenerated(module);
  }, [onGenerated]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-background border-l border-border flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-gradient-to-r from-violet-950/40 to-background">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">Generate Module with AI</h2>
              <p className="text-xs text-muted-foreground">Pick your style below</p>
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
            <Mic className="w-3.5 h-3.5 -ml-1" />
            Plan with AI
          </button>
        </div>

        {/* Mode hint */}
        <div className="px-5 py-2.5 bg-muted/20 border-b border-border/50 shrink-0">
          {mode === "quick" ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Quick:</span> Describe your scenario in one prompt and generate instantly.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Conversation:</span> Chat with AI (voice or text) — it asks up to 4 questions, then builds your module.
            </p>
          )}
        </div>

        {/* Mode content */}
        {mode === "quick"
          ? <QuickMode onGenerated={handleGenerated} />
          : <ConversationMode onGenerated={handleGenerated} />
        }
      </div>
    </div>
  );
}
