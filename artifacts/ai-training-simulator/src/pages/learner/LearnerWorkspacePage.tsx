import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AiConversationChat } from "@/components/voice/AiConversationChat";
import {
  ChevronRight, ChevronLeft, Send, CheckCircle2, BookOpen,
  Clock, AlertCircle, Target, Lightbulb, FileText, Mic, MessageSquare,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Question {
  questionId: number;
  questionOrder: number;
  questionText: string;
  expectedAnswer: string | null;
  maxPoints: number;
  questionType: string;
  rubric: string | null;
  aiConversationPrompt: string | null;
  aiRoleOrPersona: string | null;
}

interface Module {
  moduleId: number;
  title: string;
  category: string;
  difficulty: string;
  estimatedTime: string | null;
  scenarioTicket: string | null;
  scenarioContext: string | null;
  lessonTakeaway: string | null;
  questions: Question[];
}

interface ResponseEntry {
  questionId: number;
  questionText: string;
  response: string;
}

type Phase = "intro" | "questions" | "submitted";

function useModule(moduleId: number | null) {
  const [mod, setMod]       = useState<Module | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    fetch(`${base}/api/modules/${moduleId}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setMod)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [moduleId]);

  return { mod, loading, error };
}

export default function LearnerWorkspacePage() {
  const [, setLocation] = useLocation();
  const { localUser }   = useCurrentUser();
  const params   = new URLSearchParams(window.location.search);
  const moduleId = params.get("moduleId") ? parseInt(params.get("moduleId")!) : null;
  const orgId    = localUser?.organizationId ?? null;

  const { mod, loading, error } = useModule(moduleId);

  const [phase,       setPhase]       = useState<Phase>("intro");
  const [currentQ,    setCurrentQ]    = useState(0);
  const [responses,   setResponses]   = useState<ResponseEntry[]>([]);
  const [attemptId,   setAttemptId]   = useState<number | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const questions      = mod?.questions ?? [];
  const totalQuestions = questions.length;
  const progress       = phase === "intro" ? 0 : phase === "submitted" ? 100
    : Math.round((currentQ / totalQuestions) * 100);

  const currentQuestion = questions[currentQ];
  const isAiConversation = currentQuestion?.questionType === "ai_conversation";

  const currentResponse = responses.find(
    r => r.questionId === currentQuestion?.questionId
  )?.response ?? "";

  const setResponse = useCallback((text: string) => {
    if (!currentQuestion) return;
    setResponses(prev => {
      const entry: ResponseEntry = {
        questionId:   currentQuestion.questionId,
        questionText: currentQuestion.questionText,
        response:     text,
      };
      const idx = prev.findIndex(r => r.questionId === currentQuestion.questionId);
      if (idx >= 0) return prev.map((r, i) => i === idx ? entry : r);
      return [...prev, entry];
    });
  }, [currentQuestion]);

  // ── Attempt lifecycle ────────────────────────────────────────────────────

  const startAttempt = async () => {
    if (!moduleId || !orgId) { setSubmitError("Missing module or organization context."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch(`${base}/api/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ moduleId, orgId }),
      });
      if (!r.ok) throw new Error(await r.text());
      const a = await r.json();
      setAttemptId(a.attemptId);
      setPhase("questions");
      setCurrentQ(0);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveProgress = useCallback((updatedResponses?: ResponseEntry[]) => {
    if (!attemptId) return;
    fetch(`${base}/api/attempts/${attemptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ questionResponses: updatedResponses ?? responses }),
    }).catch(() => {});
  }, [attemptId, responses]);

  const goNext = async () => {
    saveProgress();
    if (currentQ < totalQuestions - 1) {
      setCurrentQ(q => q + 1);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      await submitAttempt();
    }
  };

  const submitAttempt = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch(`${base}/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionResponses: responses }),
      });
      if (!r.ok) throw new Error(await r.text());
      setPhase("submitted");
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Called by AiConversationChat when learner ends the session
  const handleConversationComplete = useCallback((transcript: string) => {
    setResponse(transcript);
  }, [setResponse]);

  // ── Guard screens ──────────────────────────────────────────────────────

  if (!moduleId) {
    return (
      <LearnerLayout>
        <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No module selected</h2>
          <p className="text-muted-foreground mb-4">Go to your module list to start a training session.</p>
          <Button onClick={() => setLocation("/learner/modules")}>View Modules</Button>
        </Card>
      </LearnerLayout>
    );
  }

  if (loading) {
    return (
      <LearnerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </LearnerLayout>
    );
  }

  if (error || !mod) {
    return (
      <LearnerLayout>
        <Card className="flex flex-col items-center p-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
          <p className="text-red-400">{error ?? "Module not found"}</p>
          <Button className="mt-4" variant="outline" onClick={() => setLocation("/learner/modules")}>Back</Button>
        </Card>
      </LearnerLayout>
    );
  }

  // ── Submitted ──────────────────────────────────────────────────────────

  if (phase === "submitted") {
    return (
      <LearnerLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Simulation Submitted!</h1>
          <p className="text-muted-foreground text-lg mb-2">Your responses have been submitted for review.</p>
          <p className="text-muted-foreground mb-8">Your admin will grade your submission and release feedback shortly.</p>
          {mod.lessonTakeaway && (
            <Card className="mb-8 text-left border-primary/20 bg-primary/5">
              <CardContent className="flex gap-3 p-5">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Lesson Takeaway</p>
                  <p className="text-sm text-foreground">{mod.lessonTakeaway}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setLocation("/learner/progress")}>View My Progress</Button>
            <Button onClick={() => setLocation("/learner/modules")}>Back to Modules</Button>
          </div>
        </div>
      </LearnerLayout>
    );
  }

  // ── Intro ──────────────────────────────────────────────────────────────

  if (phase === "intro") {
    const hasConversationQuestions = questions.some(q => q.questionType === "ai_conversation");
    return (
      <LearnerLayout>
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">{mod.title}</h1>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline">{mod.category}</Badge>
                <Badge variant="outline" className="capitalize">{mod.difficulty}</Badge>
                {mod.estimatedTime && (
                  <span className="flex items-center text-xs text-muted-foreground gap-1">
                    <Clock className="w-3 h-3" />{mod.estimatedTime}
                  </span>
                )}
                <Badge variant="outline">{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</Badge>
                {hasConversationQuestions && (
                  <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 gap-1">
                    <Mic className="w-3 h-3" /> Voice + AI Roleplay
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {mod.scenarioTicket && (
            <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex gap-3 p-4">
                <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">Ticket / Situation</p>
                  <p className="text-sm font-medium text-foreground">{mod.scenarioTicket}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {mod.scenarioContext && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Scenario Background</p>
                </div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {mod.scenarioContext}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6 border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">What you'll do</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>• Read the scenario carefully before beginning</li>
                <li>• Answer {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} based on your analysis</li>
                {hasConversationQuestions && (
                  <li className="flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Some questions are live AI roleplay — you'll speak directly with an AI character who has a real personality. It listens automatically; pause when done speaking.</span>
                  </li>
                )}
                <li>• Your responses will be reviewed and graded by your admin</li>
              </ul>
            </CardContent>
          </Card>

          {submitError && (
            <Card className="mb-4 border-red-500/30 bg-red-500/10">
              <CardContent className="flex gap-2 p-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{submitError}</p>
              </CardContent>
            </Card>
          )}

          <Button size="lg" onClick={startAttempt} disabled={submitting || questions.length === 0} className="w-full">
            {submitting
              ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
              : <ChevronRight className="w-5 h-5 mr-2" />}
            Begin Simulation
          </Button>
          {questions.length === 0 && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              This module has no questions yet — check back later.
            </p>
          )}
        </div>
      </LearnerLayout>
    );
  }

  // ── No questions guard ─────────────────────────────────────────────────

  if (questions.length === 0) {
    return (
      <LearnerLayout>
        <Card className="flex flex-col items-center p-16 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No questions available</h2>
          <p className="text-muted-foreground text-sm mb-6">This module doesn't have any questions yet.</p>
          <Button variant="outline" onClick={() => setLocation("/learner/modules")}>Back to My Modules</Button>
        </Card>
      </LearnerLayout>
    );
  }

  // ── Questions ──────────────────────────────────────────────────────────

  const conversationComplete = isAiConversation && currentResponse.length > 0;

  return (
    <LearnerLayout>
      <div className="max-w-3xl mx-auto">

        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">{mod.title}</p>
            <p className="text-sm text-muted-foreground">
              Question {currentQ + 1} of {totalQuestions}
            </p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question type badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isAiConversation
              ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
              : "bg-muted border-border text-muted-foreground"
          }`}>
            {isAiConversation
              ? <><MessageSquare className="w-3 h-3" /> AI Roleplay</>
              : <><FileText className="w-3 h-3" /> Written Response</>}
          </div>
          <span className="text-xs text-muted-foreground">
            {currentQuestion?.maxPoints ?? 10} points
          </span>
        </div>

        {/* ── AI Conversation question ── */}
        {isAiConversation ? (
          <div className="mb-4">
            {/* Question context card */}
            <Card className="mb-3 border-violet-500/20 bg-violet-500/5">
              <CardContent className="flex gap-3 p-4">
                <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 text-sm">🎭</div>
                <div>
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-0.5">Roleplay Objective</p>
                  <p className="text-sm text-foreground">{currentQuestion.questionText}</p>
                </div>
              </CardContent>
            </Card>

            {/* Conversation UI */}
            {!conversationComplete ? (
              <AiConversationChat
                key={currentQuestion.questionId}
                question={currentQuestion.aiConversationPrompt?.split("\n")[0] ?? currentQuestion.questionText}
                persona={currentQuestion.aiRoleOrPersona ?? "AI Character"}
                systemPrompt={currentQuestion.aiConversationPrompt ?? "You are a realistic character in a workplace training simulation."}
                onComplete={handleConversationComplete}
              />
            ) : (
              /* Conversation done — show transcript summary */
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">Conversation recorded</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {currentResponse}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline mt-2"
                    onClick={() => setResponse("")}
                  >
                    Redo conversation
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* ── Open text question ── */
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {currentQ + 1}
                </div>
                <p className="text-base font-medium leading-relaxed pt-1">{currentQuestion?.questionText}</p>
              </div>

              <Textarea
                ref={textareaRef}
                value={currentResponse}
                onChange={e => setResponse(e.target.value)}
                placeholder="Type your response here…"
                rows={8}
                className="resize-none text-sm"
                autoFocus
              />

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">Max {currentQuestion?.maxPoints ?? 10} points</p>
                <p className="text-xs text-muted-foreground">{currentResponse.length} chars</p>
              </div>
            </CardContent>
          </Card>
        )}

        {submitError && (
          <Card className="mb-4 border-red-500/30 bg-red-500/10">
            <CardContent className="flex gap-2 p-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{submitError}</p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <Button variant="outline" onClick={() => setCurrentQ(q => q - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={goNext}
            disabled={submitting || !currentResponse.trim()}
          >
            {submitting ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
            ) : currentQ < totalQuestions - 1 ? (
              <><ChevronRight className="w-4 h-4 mr-2" /> Next Question</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Submit Simulation</>
            )}
          </Button>
        </div>

        {isAiConversation && !conversationComplete && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Complete the conversation above before continuing
          </p>
        )}
      </div>
    </LearnerLayout>
  );
}
