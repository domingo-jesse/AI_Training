import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  BarChart2, Users, CheckCircle2, Clock, AlertCircle, Star,
  BookOpen, Search, ChevronRight, ChevronLeft, User,
  Circle, ArrowUpRight,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────

interface AttemptRow {
  attemptId: number;
  userId: number;
  moduleId: number;
  attemptState: string;   // in_progress | submitted | graded
  resultStatus: string;
  totalScore: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  learnerName: string;
  moduleTitle: string;
  moduleCategory: string;
}

interface Assignment {
  assignmentId: number;
  moduleId: number;
  learnerId: number;
  moduleTitle: string;
  learnerName: string;
  learnerEmail: string | null;
  dueDate: string | null;
  assignedAt: string;
}

interface Module {
  moduleId: number;
  title: string;
  category: string;
  difficulty: string;
  status: string;
}

interface Member {
  userId: number;
  name: string;
  email: string | null;
  role: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function scoreColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

const STATE_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  not_started: { label: "Not Started",   className: "border-border text-muted-foreground",         dot: "bg-muted-foreground" },
  in_progress: { label: "In Progress",   className: "border-blue-500/30 text-blue-400 bg-blue-500/10",    dot: "bg-blue-400" },
  submitted:   { label: "Pending Review",className: "border-amber-500/30 text-amber-400 bg-amber-500/10", dot: "bg-amber-400" },
  graded:      { label: "Graded",        className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10", dot: "bg-emerald-400" },
};

const DIFF_COLORS: Record<string, string> = {
  beginner:     "border-emerald-500/30 text-emerald-400",
  intermediate: "border-amber-500/30 text-amber-400",
  advanced:     "border-red-500/30 text-red-400",
};

// ── Stat chip ──────────────────────────────────────────────────────────────

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <Icon className={`w-5 h-5 ${color} mb-3`} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════

export default function ProgressPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [attempts,    setAttempts]    = useState<AttemptRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modules,     setModules]     = useState<Module[]>([]);
  const [members,     setMembers]     = useState<Member[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // View state
  const [tab,             setTab]             = useState<"modules" | "users">("modules");
  const [moduleSearch,    setModuleSearch]    = useState("");
  const [userSearch,      setUserSearch]      = useState("");
  const [selectedModule,  setSelectedModule]  = useState<number | null>(null);
  const [selectedUser,    setSelectedUser]    = useState<number | null>(null);

  // ── Data fetch ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 20_000);

    Promise.all([
      fetch(`${base}/api/progress/org?orgId=${orgId}`,           { credentials: "include", signal: ctrl.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${base}/api/assignments?orgId=${orgId}`,            { credentials: "include", signal: ctrl.signal }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${base}/api/modules?orgId=${orgId}`,                { credentials: "include", signal: ctrl.signal }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${base}/api/organizations/${orgId}/members`,        { credentials: "include", signal: ctrl.signal }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([prog, asgn, mods, mem]) => {
      setAttempts(Array.isArray(prog?.attempts) ? prog.attempts : []);
      setAssignments(Array.isArray(asgn) ? asgn : []);
      setModules(Array.isArray(mods) ? mods : []);
      setMembers(Array.isArray(mem) ? mem.filter((u: Member) => u.role === "learner") : []);
    }).catch(e => {
      if (e.name !== "AbortError") setError(e.message ?? "Failed to load progress");
      else setError("Request timed out. Please refresh.");
    }).finally(() => { clearTimeout(timeout); setLoading(false); });

    return () => { ctrl.abort(); clearTimeout(timeout); };
  }, [orgId]);

  // ── Derived: per-module stats ─────────────────────────────────────────────

  const moduleStats = useMemo(() => {
    return modules.map(mod => {
      const assigned   = assignments.filter(a => a.moduleId === mod.moduleId);
      const modAttempts = attempts.filter(a => a.moduleId === mod.moduleId);
      const graded     = modAttempts.filter(a => a.attemptState === "graded");
      const submitted  = modAttempts.filter(a => a.attemptState === "submitted");
      const inProgress = modAttempts.filter(a => a.attemptState === "in_progress");

      const scoredAttempts = graded.filter(a => a.totalScore != null);
      const avgScore = scoredAttempts.length > 0
        ? Math.round(scoredAttempts.reduce((s, a) => s + (a.totalScore ?? 0), 0) / scoredAttempts.length)
        : null;

      // Who started = has any attempt
      const startedUserIds = new Set(modAttempts.map(a => a.userId));
      const notStarted = assigned.filter(a => !startedUserIds.has(a.learnerId));

      const completionPct = assigned.length > 0
        ? Math.round((graded.length / assigned.length) * 100)
        : 0;

      return {
        ...mod,
        assignedCount:    assigned.length,
        notStartedCount:  notStarted.length,
        inProgressCount:  inProgress.length,
        submittedCount:   submitted.length,
        gradedCount:      graded.length,
        avgScore,
        completionPct,
        // For drill-down
        assigned,
        modAttempts,
        startedUserIds,
      };
    });
  }, [modules, assignments, attempts]);

  // ── Derived: per-user stats ───────────────────────────────────────────────

  const userStats = useMemo(() => {
    return members.map(member => {
      const userAssignments = assignments.filter(a => a.learnerId === member.userId);
      const userAttempts    = attempts.filter(a => a.userId === member.userId);
      const graded          = userAttempts.filter(a => a.attemptState === "graded");
      const scoredAttempts  = graded.filter(a => a.totalScore != null);
      const avgScore        = scoredAttempts.length > 0
        ? Math.round(scoredAttempts.reduce((s, a) => s + (a.totalScore ?? 0), 0) / scoredAttempts.length)
        : null;
      const completionPct = userAssignments.length > 0
        ? Math.round((graded.length / userAssignments.length) * 100)
        : 0;

      return {
        ...member,
        assignedCount:    userAssignments.length,
        completedCount:   graded.length,
        inProgressCount:  userAttempts.filter(a => a.attemptState === "in_progress").length,
        avgScore,
        completionPct,
        userAssignments,
        userAttempts,
      };
    });
  }, [members, assignments, attempts]);

  // ── Org-wide stats ────────────────────────────────────────────────────────

  const totalGraded     = attempts.filter(a => a.attemptState === "graded").length;
  const totalSubmitted  = attempts.filter(a => a.attemptState === "submitted").length;
  const totalInProgress = attempts.filter(a => a.attemptState === "in_progress").length;
  const allScored       = attempts.filter(a => a.totalScore != null);
  const orgAvgScore     = allScored.length > 0
    ? Math.round(allScored.reduce((s, a) => s + (a.totalScore ?? 0), 0) / allScored.length)
    : null;

  // ── Loading / error states ────────────────────────────────────────────────

  if (orgLoading || (loading && attempts.length === 0)) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!orgLoading && !currentOrg) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No organization found.</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary underline">Retry</button>
        </div>
      </AdminLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Module drill-down panel
  // ══════════════════════════════════════════════════════════════════════════

  const drillModule = selectedModule ? moduleStats.find(m => m.moduleId === selectedModule) : null;

  if (drillModule) {
    // Build learner rows: for each assigned learner, find their latest attempt
    const rows = drillModule.assigned.map(asgn => {
      const latestAttempt = drillModule.modAttempts
        .filter(a => a.userId === asgn.learnerId)
        .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0] ?? null;
      const state = latestAttempt?.attemptState ?? "not_started";
      return { asgn, attempt: latestAttempt, state };
    });

    // Also add learners who attempted but weren't assigned
    const assignedIds = new Set(drillModule.assigned.map(a => a.learnerId));
    const unassignedAttempts = drillModule.modAttempts.filter(a => !assignedIds.has(a.userId));
    const extra = unassignedAttempts.map(a => ({
      asgn: null as Assignment | null,
      attempt: a,
      state: a.attemptState,
    }));

    const allRows = [...rows, ...extra];
    const notStarted  = allRows.filter(r => r.state === "not_started");
    const inProgress  = allRows.filter(r => r.state === "in_progress");
    const submitted   = allRows.filter(r => r.state === "submitted");
    const graded      = allRows.filter(r => r.state === "graded");
    const ordered     = [...graded, ...submitted, ...inProgress, ...notStarted];

    return (
      <AdminLayout>
        {/* Back */}
        <button
          onClick={() => setSelectedModule(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Progress
        </button>

        {/* Module header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Module</p>
              <h1 className="text-2xl font-bold text-foreground">{drillModule.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{drillModule.category}</p>
            </div>
            <Badge variant="outline" className={`text-xs capitalize ${DIFF_COLORS[drillModule.difficulty] ?? ""}`}>
              {drillModule.difficulty}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Assigned",     value: drillModule.assignedCount,   color: "text-primary",       dot: "bg-primary" },
            { label: "Not Started",  value: drillModule.notStartedCount,  color: "text-muted-foreground", dot: "bg-muted-foreground" },
            { label: "In Progress",  value: drillModule.inProgressCount,  color: "text-blue-400",      dot: "bg-blue-400" },
            { label: "Graded",       value: drillModule.gradedCount,      color: "text-emerald-400",   dot: "bg-emerald-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className={`w-2 h-2 rounded-full ${s.dot} mb-3`} />
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion bar */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Completion</span>
              <span className="text-sm font-bold">{drillModule.completionPct}%</span>
            </div>
            <Progress value={drillModule.completionPct} className="h-2" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{drillModule.gradedCount} graded of {drillModule.assignedCount} assigned</span>
              {drillModule.avgScore != null && (
                <span className={`text-xs font-semibold ${scoreColor(drillModule.avgScore)}`}>
                  Avg score: {drillModule.avgScore}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Learner rows */}
        <div className="space-y-2">
          {ordered.map((row, i) => {
            const name  = row.attempt?.learnerName ?? row.asgn?.learnerName ?? "Unknown";
            const email = row.asgn?.learnerEmail ?? null;
            const cfg   = STATE_CONFIG[row.state] ?? STATE_CONFIG.not_started;
            const score = row.attempt?.totalScore ?? null;
            const date  = row.attempt?.submittedAt ?? row.attempt?.gradedAt ?? null;

            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  row.state === "graded" ? "bg-emerald-500/15 text-emerald-400"
                  : row.state === "in_progress" ? "bg-blue-500/15 text-blue-400"
                  : row.state === "submitted" ? "bg-amber-500/15 text-amber-400"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {initials(name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">{name}</p>
                  {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                  {row.asgn?.dueDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">Due {fmt(row.asgn.dueDate)}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {score != null && (
                    <span className={`text-lg font-bold ${scoreColor(score)}`}>{Math.round(score)}</span>
                  )}
                  <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                  {date && <span className="text-xs text-muted-foreground hidden sm:block">{fmt(date)}</span>}
                </div>
              </div>
            );
          })}

          {ordered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <Users className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No learners assigned to this module yet.</p>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // User drill-down panel
  // ══════════════════════════════════════════════════════════════════════════

  const drillUser = selectedUser ? userStats.find(u => u.userId === selectedUser) : null;

  if (drillUser) {
    const moduleRows = drillUser.userAssignments.map(asgn => {
      const mod = modules.find(m => m.moduleId === asgn.moduleId);
      const attempt = drillUser.userAttempts
        .filter(a => a.moduleId === asgn.moduleId)
        .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0] ?? null;
      const state = attempt?.attemptState ?? "not_started";
      return { asgn, mod, attempt, state };
    });

    return (
      <AdminLayout>
        {/* Back */}
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Progress
        </button>

        {/* User header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xl shrink-0">
            {initials(drillUser.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{drillUser.name}</h1>
            <p className="text-sm text-muted-foreground">{drillUser.email ?? "—"}</p>
          </div>
        </div>

        {/* User summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Assigned",   value: drillUser.assignedCount,   color: "text-primary" },
            { label: "Completed",  value: drillUser.completedCount,  color: "text-emerald-400" },
            { label: "In Progress",value: drillUser.inProgressCount, color: "text-blue-400" },
            { label: "Avg Score",  value: drillUser.avgScore != null ? drillUser.avgScore : "—", color: scoreColor(drillUser.avgScore) },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion bar */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall completion</span>
              <span className="text-sm font-bold">{drillUser.completionPct}%</span>
            </div>
            <Progress value={drillUser.completionPct} className="h-2" />
          </CardContent>
        </Card>

        {/* Module rows */}
        <div className="space-y-2">
          {moduleRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <BookOpen className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No modules assigned to this learner.</p>
            </div>
          )}
          {moduleRows.map((row, i) => {
            const cfg   = STATE_CONFIG[row.state] ?? STATE_CONFIG.not_started;
            const score = row.attempt?.totalScore ?? null;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  row.state === "graded"      ? "bg-emerald-500/15 text-emerald-400"
                  : row.state === "in_progress" ? "bg-blue-500/15 text-blue-400"
                  : row.state === "submitted"   ? "bg-amber-500/15 text-amber-400"
                  : "bg-muted text-muted-foreground"
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">{row.asgn.moduleTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {row.mod && (
                      <span className={`text-xs capitalize ${DIFF_COLORS[row.mod.difficulty] ?? "text-muted-foreground"}`}>
                        {row.mod.difficulty}
                      </span>
                    )}
                    {row.asgn.dueDate && (
                      <span className="text-xs text-muted-foreground">· Due {fmt(row.asgn.dueDate)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {score != null && (
                    <span className={`text-lg font-bold ${scoreColor(score)}`}>{Math.round(score)}</span>
                  )}
                  <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                  {row.attempt?.submittedAt && (
                    <span className="text-xs text-muted-foreground hidden sm:block">{fmt(row.attempt.submittedAt)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AdminLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Main dashboard (tabs)
  // ══════════════════════════════════════════════════════════════════════════

  const filteredModules = moduleStats.filter(m => {
    const q = moduleSearch.toLowerCase();
    return !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const filteredUsers = userStats.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Progress Tracking</h1>
        <p className="text-muted-foreground mt-1">{currentOrg?.organizationName} · Org-wide training analytics</p>
      </div>

      {/* Org stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Stat icon={BookOpen}     label="Total Attempts"  value={attempts.length}                                          color="text-primary" />
        <Stat icon={Clock}        label="In Progress"     value={totalInProgress}                                          color="text-blue-400" />
        <Stat icon={AlertCircle}  label="Needs Grading"   value={totalSubmitted}                                           color="text-amber-400" />
        <Stat icon={CheckCircle2} label="Graded"          value={totalGraded}                                              color="text-emerald-400" />
        <Stat icon={Star}         label="Avg Score"       value={orgAvgScore != null ? orgAvgScore : "—"}                  color="text-violet-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-muted rounded-xl w-fit">
        {(["modules", "users"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedModule(null); setSelectedUser(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "modules" ? "By Module" : "By User"}
          </button>
        ))}
      </div>

      {/* ── MODULES TAB ── */}
      {tab === "modules" && (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              placeholder="Search modules…"
              className="pl-9"
            />
          </div>

          {filteredModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <BookOpen className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No modules found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredModules.map(mod => (
                <button
                  key={mod.moduleId}
                  onClick={() => setSelectedModule(mod.moduleId)}
                  className="w-full text-left rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:bg-muted/20 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{mod.title}</p>
                        <Badge variant="outline" className={`text-xs capitalize ${DIFF_COLORS[mod.difficulty] ?? ""}`}>
                          {mod.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{mod.category}</p>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <Progress value={mod.completionPct} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">{mod.completionPct}%</span>
                      </div>

                      {/* Status chips */}
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {mod.assignedCount} assigned
                        </span>
                        {mod.notStartedCount > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Circle className="w-3 h-3" /> {mod.notStartedCount} not started
                          </span>
                        )}
                        {mod.inProgressCount > 0 && (
                          <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {mod.inProgressCount} in progress
                          </span>
                        )}
                        {mod.submittedCount > 0 && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {mod.submittedCount} needs grading
                          </span>
                        )}
                        {mod.gradedCount > 0 && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {mod.gradedCount} graded
                          </span>
                        )}
                        {mod.avgScore != null && (
                          <span className={`text-xs font-semibold ml-auto ${scoreColor(mod.avgScore)}`}>
                            avg {mod.avgScore}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search learners…"
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <Users className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No learners found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <button
                  key={u.userId}
                  onClick={() => setSelectedUser(u.userId)}
                  className="w-full text-left rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:bg-muted/20 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                      u.completionPct === 100 ? "bg-emerald-500/15 text-emerald-400"
                      : u.completionPct > 0   ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {initials(u.name)}
                    </div>

                    {/* Name + email */}
                    <div className="min-w-0 w-48 shrink-0">
                      <p className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <div className="flex items-center gap-2">
                        <Progress value={u.completionPct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{u.completionPct}%</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">{u.completedCount}/{u.assignedCount} complete</span>
                        {u.inProgressCount > 0 && (
                          <span className="text-xs text-blue-400">{u.inProgressCount} in progress</span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    {u.avgScore != null && (
                      <div className="shrink-0 text-right hidden md:block">
                        <p className={`text-xl font-bold ${scoreColor(u.avgScore)}`}>{u.avgScore}</p>
                        <p className="text-xs text-muted-foreground">avg score</p>
                      </div>
                    )}

                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
