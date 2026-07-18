import { useState, useEffect } from "react";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Clock, CheckCircle2, AlertCircle, ChevronRight, Star } from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AttemptDetail {
  attemptId: number;
  moduleId: number;
  moduleTitle: string;
  moduleCategory: string;
  moduleDifficulty: string;
  attemptState: string;
  resultStatus: string;
  totalScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
}

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  submitted:   { label: "Pending Review", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  graded:      { label: "Graded", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function LearnerProgressPage() {
  const [attempts, setAttempts] = useState<AttemptDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${base}/api/attempts/my`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setAttempts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const graded = attempts.filter(a => a.attemptState === "graded");
  const pending = attempts.filter(a => a.attemptState === "submitted");
  const inProgress = attempts.filter(a => a.attemptState === "in_progress");
  const scoredAttempts = graded.filter(a => a.totalScore != null);
  const avgScore = scoredAttempts.length > 0
    ? Math.round(scoredAttempts.reduce((s, a) => s + (a.totalScore ?? 0), 0) / scoredAttempts.length)
    : null;

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
        <h1 className="text-3xl font-display font-bold">My Progress</h1>
        <p className="text-muted-foreground mt-1">Track your training history and scores.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BookOpen,      label: "Total Attempts",   value: attempts.length,         color: "text-primary" },
          { icon: CheckCircle2,  label: "Completed",        value: graded.length,            color: "text-emerald-400" },
          { icon: AlertCircle,   label: "Pending Review",   value: pending.length,           color: "text-amber-400" },
          { icon: Star,          label: "Avg Score",        value: avgScore != null ? `${avgScore}` : "—", color: "text-violet-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {attempts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
          <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No attempts yet</h3>
          <p className="text-muted-foreground mb-6">Complete a training module to see your progress here.</p>
          <Link href="/learner/modules">
            <Button>View My Modules</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Attempt History</h2>
          {attempts.map(a => {
            const cfg = STATE_CONFIG[a.attemptState] ?? { label: a.attemptState, className: "" };
            return (
              <Card key={a.attemptId} className="hover:border-border/80 transition-colors">
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.attemptState === "graded" ? "bg-emerald-500/20" : "bg-primary/10"}`}>
                    {a.attemptState === "graded"
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <BookOpen className="w-5 h-5 text-primary" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-medium truncate text-sm">{a.moduleTitle}</p>
                      <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{a.moduleCategory}</span>
                      {a.submittedAt && <span>Submitted {fmt(a.submittedAt)}</span>}
                      {a.gradedAt && <span>Graded {fmt(a.gradedAt)}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                    {a.attemptState === "graded" && a.totalScore != null && (
                      <div className="text-right">
                        <p className="text-lg font-bold">{Math.round(a.totalScore)}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    )}
                    {a.attemptState === "in_progress" && (
                      <Link href={`/learner/workspace?moduleId=${a.moduleId}`}>
                        <Button size="sm" variant="outline">Resume <ChevronRight className="w-4 h-4 ml-1" /></Button>
                      </Link>
                    )}
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
