import { useState, useEffect, useRef, useCallback } from "react";
import { X, Sparkles, Mic, MicOff, Send, Loader2, Volume2, VolumeX, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/useVoice";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GeneratedModule {
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
    questionType: string;
    rubric: string;
    aiRoleOrPersona: string;
    aiConversationPrompt: string;
    evaluationFocus: string;
  }>;
}

interface AiPlanningPanelProps {
  onGenerated: (module: GeneratedModule) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiPlanningPanel({ onGenerated, onClose }: AiPlanningPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0); // user turns so far
  const MAX_TURNS = 5; // soft guard — after this the AI should have enough

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const voice     = useVoice();

  // ── Helpers ───────────────────────────────────────────────────────────────

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  // Send messages to the backend planning agent
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

      // Speak the AI's reply (fire-and-forget — don't block the UI)
      voice.speak(data.message).catch(() => {});

      if (data.done && data.module) {
        setIsDone(true);
        // Short delay so the TTS starts before the panel closes
        setTimeout(() => onGenerated(data.module), 800);
      }
    } catch (err: any) {
      setChatError(err.message ?? "Something went wrong");
    } finally {
      setIsThinking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGenerated]);

  // Kick off with the AI's greeting on mount
  useEffect(() => {
    chat([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(scrollToBottom, [messages]);

  // ── User sends a message ───────────────────────────────────────────────────

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
  }, [messages, isThinking, isDone, chat, voice]);

  // ── Voice: push-to-talk ────────────────────────────────────────────────────

  const handleMicClick = async () => {
    if (voice.isRecording) {
      const transcript = await voice.stopRecording();
      if (transcript) await send(transcript);
    } else {
      voice.cancelSpeak();
      await voice.startRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // ── Turn progress dots ─────────────────────────────────────────────────────
  // Show up to MAX_TURNS dots so the admin knows how long is left
  const dots = Array.from({ length: MAX_TURNS }, (_, i) => i < turnCount);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-background border-l border-border flex flex-col overflow-hidden shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-gradient-to-r from-violet-950/40 to-background">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">Plan Module with AI</h2>
              <p className="text-xs text-muted-foreground">Voice or type — 4 questions max</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Speaker toggle */}
            <button
              type="button"
              onClick={() => voice.status === "speaking" ? voice.cancelSpeak() : undefined}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                voice.status === "speaking"
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title={voice.status === "speaking" ? "Stop speaking" : "AI speaks automatically"}
            >
              {voice.status === "speaking" ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => { voice.cancelSpeak(); onClose(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Progress dots ── */}
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border/50 shrink-0">
          <span className="text-xs text-muted-foreground mr-1">Progress</span>
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                filled ? "bg-violet-500" : "bg-border"
              }`}
            />
          ))}
          {isDone && (
            <span className="text-xs text-emerald-400 font-medium ml-1">Done!</span>
          )}
        </div>

        {/* ── Chat messages ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !isThinking && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === "assistant"
                  ? "bg-violet-500/20 border border-violet-500/30"
                  : "bg-muted border border-border"
              }`}>
                {msg.role === "assistant"
                  ? <Bot className="w-3.5 h-3.5 text-violet-400" />
                  : <User className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-violet-500/10 border border-violet-500/20 text-foreground rounded-tl-sm"
                  : "bg-muted text-foreground rounded-tr-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
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
              <button
                className="underline"
                onClick={() => chat(messages)}
              >
                retry
              </button>
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        {!isDone && (
          <div className="px-5 py-4 border-t border-border shrink-0">
            {/* Voice status bar */}
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
              {/* Mic button */}
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isThinking || voice.status === "transcribing"}
                title={voice.isRecording ? "Stop recording" : "Hold to speak"}
                className={[
                  "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all focus:outline-none",
                  voice.isRecording
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                    : isThinking || voice.status === "transcribing"
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-violet-500/15 hover:bg-violet-500/25 text-violet-400",
                ].join(" ")}
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
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isThinking ? "AI is thinking…" : "Type your answer or use the mic…"}
                  disabled={isThinking || voice.isRecording || voice.status === "transcribing"}
                  rows={1}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-muted-foreground disabled:opacity-50 max-h-32 overflow-y-auto"
                  style={{ lineHeight: "1.5" }}
                />
              </div>

              {/* Send button */}
              <Button
                size="icon"
                onClick={() => send(input)}
                disabled={!input.trim() || isThinking || voice.isRecording}
                className="w-10 h-10 rounded-xl shrink-0 bg-violet-600 hover:bg-violet-500"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Enter to send · Shift+Enter for new line · Or just speak
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
