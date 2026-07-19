import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  CheckSquare, User, BookOpen, Clock, ChevronRight, X,
  CheckCircle2, AlertCircle, Send, RefreshCw, Sparkles, Info
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AttemptSummary {
  attemptId: number;
  userId: number;
  moduleId: number;
  attemptState: string;
  resultStatus: string;
  totalScore: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  learnerName: string;
  learnerEmail: string | null;
  moduleTitle: string;
  moduleCategory: string;
}

interface QuestionResponse {
  questionId: number;
  questionText: string;
  response: string;
}

interface Question {
  questionId: number;
  questionOrder: number;
  questionText: string;
  expectedAnswer: string | null;
  maxPoints: number;
  rubric: string | null;
}

interface AttemptDetail extends AttemptSummary {
  scenarioContext: string | null;
  scenarioTicket: string | null;
  hiddenRootCause: string | null;
  expectedDiagnosis: string | null;
  expectedReasoningPath: string | null;
  expectedNextSteps: string | null;
  llmScoringEnabled: boolean | null;
  llmGraderInstructions: string | null;
  questions: Question[];
  submissionScore: any | null;
}

interface GradeForm {
  totalScore: string;
  overallFeedback: string;
  strengths: string;
  missedPoints: string;
  bestPracticeReasoning: string;
  recommendedResponse: string;
  takeawaySummary: string;
  resultStatus: "approved" | "rejected";
  showResultsToLearner: boolean;
  showFeedbackToLearner: boolean;
}

const EMPTY_GRADE: GradeForm = {
  totalScore: "",
  overallFeedback: "",
  strengths: "",
  missedPoints: "",
  bestPracticeReasoning: "",
  recommendedResponse: "",
  takeawaySummary: "",
  resultStatus: "approved",
  showResultsToLearner: true,
  showFeedbackToLearner: true,
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_review: { label: "Pending Review", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  approved:       { label: "Approved",       className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  rejected:       { label: "Rejected",       className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default function GradingPage() {
  const { currentOrg } = useOrganization();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "all">("pending_review");
  const [selected, setSelected] = useState<AttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeForm>(EMPTY_GRADE);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const orgId = currentOrg?.organizationId;

  const loadAttempts = () => {
    if (!orgId) return;
    setLoading(true);
    const qs = filter === "all" ? `orgId=${orgId}` : `orgId=${orgId}&status=pending_review`;
    fetch(`${base}/api/attempts?${qs}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setAttempts(Array.isArray(d) ? d : []))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAttempts(); }, [orgId, filter]);

  const openDetail = async (attemptId: number) => {
    setLoadingDetail(true);
    setSelected(null);
    setSaveMsg(null);
    setAiPrefilled(false);
    setAiError(null);
    try {
      const r = await fetch(`${base}/api/attempts/${attemptId}`, { credentials: "include" });
      const d: AttemptDetail = await r.json();
      setSelected(d);
      // Pre-fill form if already graded
      setGradeForm({
        totalScore: d.submissionScore?.finalTotalScore ?? d.totalScore ?? "",
        overallFeedback: d.submissionScore?.overallAdminFeedback ?? "",
        strengths: d.submissionScore?.learnerStrengths ?? "",
        missedPoints: d.submissionScore?.learnerMissedPoints ?? "",
        bestPracticeReasoning: d.submissionScore?.bestPracticeReasoning ?? "",
        recommendedResponse: d.submissionScore?.recommendedResponse ?? "",
        takeawaySummary: d.submissionScore?.lessonTakeaway ?? "",
        resultStatus: d.resultStatus === "approved" ? "approved" : "approved",
        showResultsToLearner: d.submissionScore?.showResultsToLearner ?? true,
        showFeedbackToLearner: d.submissionScore?.showFeedbackToLearner ?? true,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const submitGrade = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch(`${base}/api/attempts/${selected.attemptId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          totalScore: parseFloat(gradeForm.totalScore) || 0,
          overallFeedback: gradeForm.overallFeedback,
          strengths: gradeForm.strengths,
          missedPoints: gradeForm.missedPoints,
          bestPracticeReasoning: gradeForm.bestPracticeReasoning,
          recommendedResponse: gradeForm.recommendedResponse,
          takeawaySummary: gradeForm.takeawaySummary,
          resultStatus: gradeForm.resultStatus,
          showResultsToLearner: gradeForm.showResultsToLearner,
          showFeedbackToLearner: gradeForm.showFeedbackToLearner,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setSaveMsg({ type: "ok", text: "Grade saved and learner notified." });
      loadAttempts();
    } catch (e: any) {
      setSaveMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const requestAiGrade = async () => {
    if (!selected) return;
    setAiGrading(true);
    setAiError(null);
    setAiPrefilled(false);
    try {
      const r = await fetch(`${base}/api/attempts/${selected.attemptId}/grade-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok) {
        setAiError(data.error ?? "AI grading failed. Please try again.");
        return;
      }
      setGradeForm(prev => ({
        ...prev,
        totalScore: String(data.totalScore ?? prev.totalScore),
        overallFeedback: data.overallFeedback ?? prev.overallFeedback,
        strengths: data.strengths ?? prev.strengths,
        missedPoints: data.missedPoints ?? prev.missedPoints,
        bestPracticeReasoning: data.bestPracticeReasoning ?? prev.bestPracticeReasoning,
        recommendedResponse: data.recommendedResponse ?? prev.recommendedResponse,
        takeawaySummary: data.takeawaySummary ?? prev.takeawaySummary,
        resultStatus: data.resultStatus === "rejected" ? "rejected" : "approved",
      }));
      setAiPrefilled(true);
    } catch {
      setAiError("Network error. Please try again.");
    } finally {
      setAiGrading(false);
    }
  };

  const setG = (key: keyof GradeForm) => (val: string | boolean) =>
    setGradeForm(prev => ({ ...prev, [key]: val }));

  // Parse question responses
  const parsedResponses: QuestionResponse[] = (() => {
    if (!selected?.questionResponses) return [];
    try {
      const parsed = JSON.parse(selected.questionResponses);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();

  const totalMaxPoints = selected?.questions.reduce((s, q) => s + q.maxPoints, 0) ?? 0;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Grading Center</h1>
          <p className="text-muted-foreground mt-1">Review and grade learner submissions.</p>
        </div>
        <div className="flex gap-2">
          {(["pending_review", "all"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}>
              {f === "pending_review" ? "Pending Review" : "All Submissions"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Attempt list */}
        <div className="w-96 shrink-0 overflow-y-auto space-y-2">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && attempts.length === 0 && (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
              <CheckSquare className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium">No submissions</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === "pending_review" ? "All caught up!" : "No attempts yet."}
              </p>
            </Card>
          )}
          {attempts.map(a => {
            const cfg = STATUS_CONFIG[a.resultStatus] ?? STATUS_CONFIG["pending_review"];
            return (
              <Card
                key={a.attemptId}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${selected?.attemptId === a.attemptId ? "border-primary/60 bg-primary/5" : ""}`}
                onClick={() => openDetail(a.attemptId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.learnerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.learnerEmail}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${cfg.className}`}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm font-medium truncate mb-1">{a.moduleTitle}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{a.moduleCategory}</span>
                    <span>{fmt(a.submittedAt)}</span>
                  </div>
                  {a.totalScore != null && (
                    <div className="mt-2 text-xs font-medium text-emerald-400">
                      Score: {Math.round(a.totalScore)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {loadingDetail && (
            <div className="flex justify-center pt-24">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {!selected && !loadingDetail && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <CheckSquare className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">Select a submission to grade</p>
            </div>
          )}

          {selected && !loadingDetail && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selected.moduleTitle}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.learnerName} · Submitted {fmt(selected.submittedAt)}
                  </p>
                </div>
              </div>

              {/* Scenario context */}
              {selected.scenarioContext && (
                <Card className="border-border/60">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Scenario</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4">
                    {selected.scenarioTicket && (
                      <p className="text-sm font-medium text-amber-400 mb-2">{selected.scenarioTicket}</p>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selected.scenarioContext}</p>
                  </CardContent>
                </Card>
              )}

              {/* Hidden context for grader */}
              {(selected.hiddenRootCause || selected.expectedDiagnosis) && (
                <Card className="border-violet-500/30 bg-violet-500/5">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold text-violet-400 uppercase tracking-wide">Grader Reference (hidden from learner)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4 space-y-2 text-sm">
                    {selected.hiddenRootCause && <div><span className="font-medium">Root cause: </span>{selected.hiddenRootCause}</div>}
                    {selected.expectedDiagnosis && <div><span className="font-medium">Expected diagnosis: </span>{selected.expectedDiagnosis}</div>}
                    {selected.expectedReasoningPath && <div><span className="font-medium">Expected reasoning: </span>{selected.expectedReasoningPath}</div>}
                    {selected.expectedNextSteps && <div><span className="font-medium">Expected next steps: </span>{selected.expectedNextSteps}</div>}
                  </CardContent>
                </Card>
              )}

              {/* Q&A */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Learner Responses</h3>
                {selected.questions.map((q, i) => {
                  const resp = parsedResponses.find(r => r.questionId === q.questionId);
                  return (
                    <Card key={q.questionId} className="border-border/60">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm font-medium">{q.questionText}</p>
                          <Badge variant="outline" className="ml-auto text-xs shrink-0">{q.maxPoints} pts</Badge>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {resp?.response || <span className="text-muted-foreground italic">No response</span>}
                          </p>
                        </div>
                        {q.expectedAnswer && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Expected: </span>{q.expectedAnswer}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Grade form */}
              <Card className="border-primary/20">
                <CardHeader className="py-4 px-5 border-b border-border/50 flex-row items-center justify-between">
                  <CardTitle className="text-base">Grade Submission</CardTitle>
                  {selected.llmScoringEnabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-violet-500/40 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
                      onClick={requestAiGrade}
                      disabled={aiGrading}
                    >
                      {aiGrading
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Grading…</>
                        : <><Sparkles className="w-3.5 h-3.5" /> AI Grade</>}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {aiPrefilled && (
                    <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>AI has pre-filled this form. Review all fields before submitting — edit anything that needs adjustment.</span>
                    </div>
                  )}
                  {aiError && (
                    <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {aiError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Total Score{totalMaxPoints > 0 ? ` (max ${totalMaxPoints})` : ""}</Label>
                      <Input
                        type="number" min={0} max={totalMaxPoints || 9999}
                        value={gradeForm.totalScore}
                        onChange={e => setG("totalScore")(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Result</Label>
                      <select
                        value={gradeForm.resultStatus}
                        onChange={e => setG("resultStatus")(e.target.value as any)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground"
                      >
                        <option value="approved">Approved</option>
                        <option value="rejected">Needs revision</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Overall Feedback</Label>
                    <Textarea value={gradeForm.overallFeedback} onChange={e => setG("overallFeedback")(e.target.value)} placeholder="General feedback for the learner…" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Strengths</Label>
                      <Textarea value={gradeForm.strengths} onChange={e => setG("strengths")(e.target.value)} placeholder="What did they do well?" rows={2} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Missed Points</Label>
                      <Textarea value={gradeForm.missedPoints} onChange={e => setG("missedPoints")(e.target.value)} placeholder="What did they miss?" rows={2} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Best Practice / Recommended Response</Label>
                    <Textarea value={gradeForm.recommendedResponse} onChange={e => setG("recommendedResponse")(e.target.value)} placeholder="Ideal response for reference…" rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Lesson Takeaway</Label>
                    <Textarea value={gradeForm.takeawaySummary} onChange={e => setG("takeawaySummary")(e.target.value)} placeholder="Key lesson for the learner…" rows={2} />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={gradeForm.showResultsToLearner}
                        onChange={e => setG("showResultsToLearner")(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary" />
                      Show score to learner
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={gradeForm.showFeedbackToLearner}
                        onChange={e => setG("showFeedbackToLearner")(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary" />
                      Show feedback to learner
                    </label>
                  </div>

                  {saveMsg && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${saveMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {saveMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {saveMsg.text}
                    </div>
                  )}

                  <Button className="w-full" onClick={submitGrade} disabled={saving}>
                    {saving
                      ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                      : <><Send className="w-4 h-4 mr-2" /> Submit Grade</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
