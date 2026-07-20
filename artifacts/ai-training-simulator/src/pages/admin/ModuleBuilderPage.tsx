import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Save, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  BookOpen, FileText, Target, HelpCircle, AlertCircle, CheckCircle2,
  Sparkles, X, Mic,
} from "lucide-react";
import { Link } from "wouter";
import { AiPlanningPanel } from "@/components/voice/AiPlanningPanel";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  questionId?: number;
  questionText: string;
  expectedAnswer: string;
  maxPoints: number;
  questionType: string;
  rubric: string;
  aiConversationPrompt: string;
  aiRoleOrPersona: string;
  evaluationFocus: string;
}

interface ModuleForm {
  title: string;
  category: string;
  difficulty: string;
  description: string;
  estimatedTime: string;
  status: string;
  scenarioTicket: string;
  scenarioContext: string;
  hiddenRootCause: string;
  expectedDiagnosis: string;
  expectedReasoningPath: string;
  expectedNextSteps: string;
  lessonTakeaway: string;
  learningObjectives: string;
  scoringStyle: string;
  llmScoringEnabled: boolean;
  llmGraderInstructions: string;
}

const EMPTY_FORM: ModuleForm = {
  title: "", category: "", difficulty: "intermediate", description: "",
  estimatedTime: "", status: "active", scenarioTicket: "", scenarioContext: "",
  hiddenRootCause: "", expectedDiagnosis: "", expectedReasoningPath: "",
  expectedNextSteps: "", lessonTakeaway: "", learningObjectives: "",
  scoringStyle: "manual", llmScoringEnabled: false, llmGraderInstructions: "",
};

const EMPTY_QUESTION: Question = {
  questionText: "", expectedAnswer: "", maxPoints: 10, questionType: "open_text",
  rubric: "", aiConversationPrompt: "", aiRoleOrPersona: "", evaluationFocus: "",
};

const TABS = [
  { id: "basics",   label: "Basics",   icon: BookOpen },
  { id: "scenario", label: "Scenario", icon: FileText },
  { id: "scoring",  label: "Scoring",  icon: Target },
  { id: "questions",label: "Questions",icon: HelpCircle },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options, className = "" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-foreground ${className}`}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Question editor ────────────────────────────────────────────────────────────

function QuestionCard({
  q, index, total, onChange, onDelete, onMove,
}: {
  q: Question; index: number; total: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(!q.questionId);

  return (
    <Card className="border-border/60">
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {index + 1}
          </div>
          <p className="flex-1 text-sm font-medium truncate">
            {q.questionText || <span className="text-muted-foreground italic">New question…</span>}
          </p>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(-1)}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 px-4 pb-4 space-y-4">
          <Field label="Question *">
            <Textarea
              value={q.questionText}
              onChange={e => onChange({ ...q, questionText: e.target.value })}
              placeholder="What should the learner demonstrate or answer?"
              rows={2}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Question type">
              <Select
                value={q.questionType}
                onChange={v => onChange({ ...q, questionType: v })}
                options={[
                  { value: "open_text", label: "Open text" },
                  { value: "multiple_choice", label: "Multiple choice" },
                  { value: "ai_conversation", label: "AI conversation" },
                ]}
              />
            </Field>
            <Field label="Max points">
              <Input
                type="number" min={0} max={100}
                value={q.maxPoints}
                onChange={e => onChange({ ...q, maxPoints: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <Field label="Expected answer / rubric" hint="Used by manual and keyword scoring.">
            <Textarea
              value={q.expectedAnswer}
              onChange={e => onChange({ ...q, expectedAnswer: e.target.value })}
              placeholder="Describe what a correct answer looks like…"
              rows={2}
            />
          </Field>

          <Field label="Grading guidance" hint="Extra notes for the grader or AI.">
            <Textarea
              value={q.rubric}
              onChange={e => onChange({ ...q, rubric: e.target.value })}
              placeholder="Criteria, partial credit rules, edge cases…"
              rows={2}
            />
          </Field>

          {q.questionType === "ai_conversation" && (
            <>
              <Field label="AI persona / role">
                <Input
                  value={q.aiRoleOrPersona}
                  onChange={e => onChange({ ...q, aiRoleOrPersona: e.target.value })}
                  placeholder="e.g. Frustrated customer calling about billing issue"
                />
              </Field>
              <Field label="Conversation prompt">
                <Textarea
                  value={q.aiConversationPrompt}
                  onChange={e => onChange({ ...q, aiConversationPrompt: e.target.value })}
                  placeholder="Instructions for the AI playing this role…"
                  rows={3}
                />
              </Field>
              <Field label="Evaluation focus">
                <Input
                  value={q.evaluationFocus}
                  onChange={e => onChange({ ...q, evaluationFocus: e.target.value })}
                  placeholder="What the grader should focus on when evaluating this exchange"
                />
              </Field>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}


// ── Main page ──────────────────────────────────────────────────────────────────

export default function ModuleBuilderPage() {
  const { currentOrg } = useOrganization();
  const [, setLocation] = useLocation();

  // Read ?id= from URL
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id") ? parseInt(urlParams.get("id")!) : null;

  const [activeTab, setActiveTab] = useState("basics");
  const [form, setForm] = useState<ModuleForm>(EMPTY_FORM);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Load existing module if editing
  useEffect(() => {
    if (!editId) return;
    fetch(`${basePath}/api/modules/${editId}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setForm({
          title: data.title ?? "",
          category: data.category ?? "",
          difficulty: data.difficulty ?? "intermediate",
          description: data.description ?? "",
          estimatedTime: data.estimatedTime ?? "",
          status: data.status ?? "draft",
          scenarioTicket: data.scenarioTicket ?? "",
          scenarioContext: data.scenarioContext ?? "",
          hiddenRootCause: data.hiddenRootCause ?? "",
          expectedDiagnosis: data.expectedDiagnosis ?? "",
          expectedReasoningPath: data.expectedReasoningPath ?? "",
          expectedNextSteps: data.expectedNextSteps ?? "",
          lessonTakeaway: data.lessonTakeaway ?? "",
          learningObjectives: data.learningObjectives ?? "",
          scoringStyle: data.scoringStyle ?? "manual",
          llmScoringEnabled: data.llmScoringEnabled ?? false,
          llmGraderInstructions: data.llmGraderInstructions ?? "",
        });
        setQuestions((data.questions ?? []).map((q: any) => ({
          questionId: q.questionId,
          questionText: q.questionText ?? "",
          expectedAnswer: q.expectedAnswer ?? "",
          maxPoints: q.maxPoints ?? 10,
          questionType: q.questionType ?? "open_text",
          rubric: q.rubric ?? "",
          aiConversationPrompt: q.aiConversationPrompt ?? "",
          aiRoleOrPersona: q.aiRoleOrPersona ?? "",
          evaluationFocus: q.evaluationFocus ?? "",
        })));
      })
      .catch(() => setSaveError("Failed to load module"))
      .finally(() => setIsLoading(false));
  }, [editId]);

  const set = (key: keyof ModuleForm) => (val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.title || !form.category || !form.difficulty) {
      setSaveError("Title, category, and difficulty are required.");
      setActiveTab("basics");
      return;
    }
    if (!currentOrg) { setSaveError("No organization selected."); return; }

    setIsSaving(true);
    setSaveError(null);

    try {
      let moduleId = editId;

      if (editId) {
        // Update existing
        const r = await fetch(`${basePath}/api/modules/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        // Create new
        const r = await fetch(`${basePath}/api/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...form, orgId: currentOrg.organizationId }),
        });
        if (!r.ok) throw new Error(await r.text());
        const created = await r.json();
        moduleId = created.moduleId;
      }

      // Sync questions: delete removed ones, create/update the rest
      for (const q of questions) {
        if (q.questionId) {
          await fetch(`${basePath}/api/modules/${moduleId}/questions/${q.questionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(q),
          });
        } else {
          const r = await fetch(`${basePath}/api/modules/${moduleId}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(q),
          });
          if (r.ok) {
            const created = await r.json();
            q.questionId = created.questionId;
          }
        }
      }

      setSaved(true);

      // After save, go to Assign Modules so the admin can immediately assign learners
      if (moduleId) {
        setTimeout(() => setLocation(`/admin/assign-modules?moduleId=${moduleId}`), 600);
      }
    } catch (e: any) {
      setSaveError(e.message ?? "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => setQuestions(prev => [...prev, { ...EMPTY_QUESTION }]);

  const updateQuestion = (i: number, q: Question) =>
    setQuestions(prev => prev.map((x, idx) => idx === i ? q : x));

  const deleteQuestion = async (i: number) => {
    const q = questions[i];
    if (q.questionId && editId) {
      await fetch(`${basePath}/api/modules/${editId}/questions/${q.questionId}`, {
        method: "DELETE", credentials: "include",
      });
    }
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  const moveQuestion = (i: number, dir: -1 | 1) => {
    setQuestions(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleAiGenerated = (module: {
    title: string; category: string; difficulty: string; description: string;
    estimatedTime: string; learningObjectives: string; scenarioTicket: string;
    scenarioContext: string; hiddenRootCause: string; expectedDiagnosis: string;
    expectedReasoningPath: string; expectedNextSteps: string; lessonTakeaway: string;
    llmScoringEnabled: boolean; llmGraderInstructions: string;
    questions: Question[];
  }) => {
    setForm({
      title: module.title ?? "",
      category: module.category ?? "",
      difficulty: module.difficulty ?? "intermediate",
      description: module.description ?? "",
      estimatedTime: module.estimatedTime ?? "",
      status: "draft",
      scenarioTicket: module.scenarioTicket ?? "",
      scenarioContext: module.scenarioContext ?? "",
      hiddenRootCause: module.hiddenRootCause ?? "",
      expectedDiagnosis: module.expectedDiagnosis ?? "",
      expectedReasoningPath: module.expectedReasoningPath ?? "",
      expectedNextSteps: module.expectedNextSteps ?? "",
      lessonTakeaway: module.lessonTakeaway ?? "",
      learningObjectives: module.learningObjectives ?? "",
      scoringStyle: "llm",
      llmScoringEnabled: module.llmScoringEnabled ?? true,
      llmGraderInstructions: module.llmGraderInstructions ?? "",
    });
    setQuestions((module.questions ?? []).map((q: any) => ({
      questionText: q.questionText ?? "",
      expectedAnswer: q.expectedAnswer ?? "",
      maxPoints: q.maxPoints ?? 10,
      questionType: q.questionType ?? "open_text",
      rubric: q.rubric ?? "",
      aiConversationPrompt: q.aiConversationPrompt ?? "",
      aiRoleOrPersona: q.aiRoleOrPersona ?? "",
      evaluationFocus: q.evaluationFocus ?? "",
    })));
    setAiGenerated(true);
    setShowAiPanel(false);
    setActiveTab("basics");
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {showAiPanel && (
        <AiPlanningPanel
          onGenerated={handleAiGenerated}
          onClose={() => setShowAiPanel(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/modules">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {editId ? "Edit Module" : "New Module"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {form.title || "Untitled module"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          {!editId && (
            <Button
              variant="outline"
              onClick={() => setShowAiPanel(true)}
              className="border-violet-500/40 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 gap-2"
            >
              <Mic className="w-4 h-4" />
              Plan with AI
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[90px]">
            {isSaving
              ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        </div>
      </div>

      {/* AI-generated banner */}
      {aiGenerated && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300 flex-1">
            Module generated by AI — review each tab and edit anything before saving.
          </p>
          <button
            onClick={() => setAiGenerated(false)}
            className="text-violet-400 hover:text-violet-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveError && (
        <Card className="mb-4 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{saveError}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "questions" && questions.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{questions.length}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Basics ── */}
      {activeTab === "basics" && (
        <div className="grid gap-6 max-w-2xl">
          <Field label="Title *">
            <Input value={form.title} onChange={e => set("title")(e.target.value)} placeholder="e.g. Customer Escalation Handling" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category *">
              <Input value={form.category} onChange={e => set("category")(e.target.value)} placeholder="e.g. Customer Service" />
            </Field>
            <Field label="Difficulty *">
              <Select
                value={form.difficulty}
                onChange={set("difficulty")}
                options={[
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ]}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={set("status")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Field>
            <Field label="Estimated time" hint="e.g. 30 mins, 1 hour">
              <Input value={form.estimatedTime} onChange={e => set("estimatedTime")(e.target.value)} placeholder="45 mins" />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={e => set("description")(e.target.value)}
              placeholder="Brief description shown to learners…"
              rows={3}
            />
          </Field>

          <Field label="Learning objectives">
            <Textarea
              value={form.learningObjectives}
              onChange={e => set("learningObjectives")(e.target.value)}
              placeholder="What learners will achieve by completing this module…"
              rows={3}
            />
          </Field>
        </div>
      )}

      {/* ── Scenario ── */}
      {activeTab === "scenario" && (
        <div className="grid gap-6 max-w-2xl">
          <Field label="Scenario ticket / title" hint="The support ticket or situation the learner receives.">
            <Input value={form.scenarioTicket} onChange={e => set("scenarioTicket")(e.target.value)} placeholder="e.g. #1042 – Customer unable to log in" />
          </Field>

          <Field label="Scenario context" hint="Background information shown to the learner at the start.">
            <Textarea
              value={form.scenarioContext}
              onChange={e => set("scenarioContext")(e.target.value)}
              placeholder="Describe the situation, context, and any relevant background…"
              rows={5}
            />
          </Field>

          <Field label="Hidden root cause" hint="Not shown to learners — the actual answer the scenario is testing.">
            <Textarea
              value={form.hiddenRootCause}
              onChange={e => set("hiddenRootCause")(e.target.value)}
              placeholder="What is actually wrong / the real cause of the issue?"
              rows={3}
            />
          </Field>

          <Field label="Expected diagnosis">
            <Textarea
              value={form.expectedDiagnosis}
              onChange={e => set("expectedDiagnosis")(e.target.value)}
              placeholder="What conclusion should a skilled learner reach?"
              rows={3}
            />
          </Field>

          <Field label="Expected reasoning path">
            <Textarea
              value={form.expectedReasoningPath}
              onChange={e => set("expectedReasoningPath")(e.target.value)}
              placeholder="The logical steps a learner should take to solve this…"
              rows={3}
            />
          </Field>

          <Field label="Expected next steps">
            <Textarea
              value={form.expectedNextSteps}
              onChange={e => set("expectedNextSteps")(e.target.value)}
              placeholder="What actions should the learner take after diagnosis?"
              rows={3}
            />
          </Field>

          <Field label="Lesson takeaway">
            <Textarea
              value={form.lessonTakeaway}
              onChange={e => set("lessonTakeaway")(e.target.value)}
              placeholder="Key lesson or principle this scenario teaches…"
              rows={2}
            />
          </Field>
        </div>
      )}

      {/* ── Scoring ── */}
      {activeTab === "scoring" && (
        <div className="grid gap-6 max-w-2xl">
          <Field label="Scoring style">
            <Select
              value={form.scoringStyle}
              onChange={set("scoringStyle")}
              options={[
                { value: "manual", label: "Manual — admin grades each submission" },
                { value: "keyword", label: "Keyword — automated keyword matching" },
                { value: "llm", label: "AI — LLM grades automatically" },
              ]}
            />
          </Field>

          <Field label="AI scoring">
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="llmEnabled"
                checked={form.llmScoringEnabled}
                onChange={e => set("llmScoringEnabled")(e.target.checked)}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <label htmlFor="llmEnabled" className="text-sm text-foreground cursor-pointer">
                Enable AI (LLM) scoring for this module
              </label>
            </div>
          </Field>

          {form.llmScoringEnabled && (
            <Field label="LLM grader instructions" hint="Instructions passed to the AI when grading submissions.">
              <Textarea
                value={form.llmGraderInstructions}
                onChange={e => set("llmGraderInstructions")(e.target.value)}
                placeholder="You are grading a customer service simulation. Award full points if…"
                rows={5}
              />
            </Field>
          )}

          <Field label="Learner feedback visibility">
            <Select
              value={form.scoringStyle} // using a dedicated field would be better but reusing here for simplicity
              onChange={() => {}}
              options={[
                { value: "admin_approved_only", label: "Admin-approved only" },
                { value: "immediate", label: "Immediate (auto-released)" },
                { value: "hidden", label: "Hidden from learner" },
              ]}
            />
          </Field>
        </div>
      )}

      {/* ── Questions ── */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {questions.length === 0 && (
            <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
              <HelpCircle className="w-10 h-10 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No questions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Questions are answered by learners during the simulation.</p>
              <Button onClick={addQuestion}><Plus className="w-4 h-4 mr-2" /> Add First Question</Button>
            </Card>
          )}

          {questions.map((q, i) => (
            <QuestionCard
              key={q.questionId ?? `new-${i}`}
              q={q}
              index={i}
              total={questions.length}
              onChange={updated => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              onMove={dir => moveQuestion(i, dir)}
            />
          ))}

          {questions.length > 0 && (
            <Button variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
