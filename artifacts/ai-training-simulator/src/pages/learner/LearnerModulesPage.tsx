import { useState, useEffect } from "react";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { BookOpen, Clock, ChevronRight, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Assignment {
  assignmentId: number;
  moduleId: number;
  title: string;
  category: string;
  difficulty: string;
  description: string | null;
  estimatedTime: string | null;
  dueDate: string | null;
}

interface AttemptSummary {
  attemptId: number;
  moduleId: number;
  attemptState: string;
  resultStatus: string;
  totalScore: number | null;
  submittedAt: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

function statusBadge(attempt: AttemptSummary | undefined) {
  if (!attempt) return <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-400 border-slate-500/30">Not started</Badge>;
  if (attempt.attemptState === "in_progress") return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">In progress</Badge>;
  if (attempt.attemptState === "submitted") return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">Pending review</Badge>;
  if (attempt.attemptState === "graded") return <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Graded</Badge>;
  return null;
}

export default function LearnerModulesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${base}/api/assignments/my`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/attempts/my`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([a, at]) => {
      setAssignments(Array.isArray(a) ? a : []);
      setAttempts(Array.isArray(at) ? at : []);
    }).finally(() => setLoading(false));
  }, []);

  const formatDue = (d: string | null) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: "Overdue", urgent: true };
    if (diff === 0) return { label: "Due today", urgent: true };
    if (diff === 1) return { label: "Due tomorrow", urgent: false };
    return { label: `Due in ${diff} days`, urgent: false };
  };

  const latestAttempt = (moduleId: number) =>
    attempts.filter(a => a.moduleId === moduleId).sort((a, b) =>
      new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime()
    )[0];

  if (loading) {
    return (
      <LearnerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </LearnerLayout>
    );
  }

  return (
    <LearnerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Modules</h1>
        <p className="text-muted-foreground mt-1">
          {assignments.length} module{assignments.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No modules yet</h3>
          <p className="text-muted-foreground">Your admin will assign training modules to you soon.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map(a => {
            const attempt = latestAttempt(a.moduleId);
            const due = formatDue(a.dueDate);
            const isGraded = attempt?.attemptState === "graded";

            return (
              <Card key={a.assignmentId} className="hover:border-border/80 transition-colors">
                <CardContent className="flex items-center gap-5 py-5 px-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isGraded ? "bg-emerald-500/20" : "bg-primary/10"}`}>
                    {isGraded
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      : <BookOpen className="w-6 h-6 text-primary" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold truncate">{a.title}</p>
                      {statusBadge(attempt)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span>{a.category}</span>
                      <Badge variant="outline" className={`capitalize text-xs ${DIFFICULTY_COLORS[a.difficulty] ?? ""}`}>
                        {a.difficulty}
                      </Badge>
                      {a.estimatedTime && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.estimatedTime}</span>
                      )}
                      {due && (
                        <span className={due.urgent ? "text-red-400" : ""}>{due.label}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {attempt?.attemptState === "graded" && attempt.totalScore != null && (
                      <div className="text-right mr-2">
                        <p className="text-lg font-bold text-foreground">{Math.round(attempt.totalScore)}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    )}
                    <Link href={`/learner/workspace?moduleId=${a.moduleId}`}>
                      <Button size="sm">
                        {!attempt ? <><PlayCircle className="w-4 h-4 mr-1" /> Start</> :
                         attempt.attemptState === "in_progress" ? "Resume" :
                         <><ChevronRight className="w-4 h-4 mr-1" /> View</>}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </LearnerLayout>
  );
}
