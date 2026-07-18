import { useState, useEffect } from "react";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Trophy, BookOpen, Clock, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Assignment {
  assignmentId: number;
  moduleId: number;
  title: string;
  category: string;
  difficulty: string;
  estimatedTime: string | null;
  dueDate: string | null;
}

interface AttemptSummary {
  attemptId: number;
  moduleId: number;
  moduleTitle: string;
  attemptState: string;
  resultStatus: string;
  totalScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function LearnerHomePage() {
  const { localUser } = useCurrentUser();
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

  // Find in-progress attempt
  const inProgressAttempt = attempts.find(a => a.attemptState === "in_progress");
  const inProgressAssignment = inProgressAttempt
    ? assignments.find(a => a.moduleId === inProgressAttempt.moduleId)
    : null;

  // First unstarted assignment
  const startedModuleIds = new Set(attempts.map(a => a.moduleId));
  const nextUnstarted = assignments.find(a => !startedModuleIds.has(a.moduleId));
  const featuredModule = inProgressAssignment ?? nextUnstarted ?? assignments[0];

  const completedCount = attempts.filter(a => a.attemptState === "graded").length;
  const pendingReview = attempts.filter(a => a.attemptState === "submitted").length;
  const totalAssigned = assignments.length;

  const formatDue = (d: string | null) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: "Overdue", urgent: true };
    if (diff === 0) return { label: "Due today", urgent: true };
    if (diff === 1) return { label: "Due tomorrow", urgent: false };
    return { label: `Due in ${diff} days`, urgent: false };
  };

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
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome, {localUser?.name?.split(" ")[0] || "Learner"}
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          {totalAssigned === 0
            ? "No modules assigned yet. Check back soon."
            : `${totalAssigned} module${totalAssigned !== 1 ? "s" : ""} assigned to you.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* Featured / In-Progress Module */}
          {featuredModule && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                {inProgressAssignment ? "Continue Where You Left Off" : "Your Next Module"}
              </h2>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20 overflow-hidden relative">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <CardContent className="p-8 relative z-10 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <PlayCircle className="w-10 h-10" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold mb-1">{featuredModule.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{featuredModule.category}</p>
                      <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start">
                        {featuredModule.estimatedTime && (
                          <span className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 mr-1" />{featuredModule.estimatedTime}
                          </span>
                        )}
                        <Badge variant="outline" className={`capitalize text-xs ${DIFFICULTY_COLORS[featuredModule.difficulty] ?? ""}`}>
                          {featuredModule.difficulty}
                        </Badge>
                        {inProgressAssignment && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Link href={`/learner/workspace?moduleId=${featuredModule.moduleId}`}>
                        <Button size="lg" className="shadow-md shadow-primary/20">
                          {inProgressAssignment ? "Resume" : "Start"} Training
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </section>
          )}

          {/* Assigned Modules List */}
          {assignments.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Assigned to You</h2>
                <Link href="/learner/modules" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>
              <div className="grid gap-3">
                {assignments.slice(0, 4).map(a => {
                  const myAttempt = attempts.find(at => at.moduleId === a.moduleId);
                  const due = formatDue(a.dueDate);
                  return (
                    <Card key={a.assignmentId} className="hover:border-border/80 transition-colors">
                      <CardContent className="flex items-center gap-4 py-3 px-5">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{a.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{a.category}</span>
                            {due && (
                              <span className={`text-xs ${due.urgent ? "text-red-400" : "text-muted-foreground"}`}>
                                · {due.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {myAttempt?.attemptState === "graded" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                          {myAttempt?.attemptState === "submitted" && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                              Pending review
                            </Badge>
                          )}
                          <Link href={`/learner/workspace?moduleId=${a.moduleId}`}>
                            <Button variant="ghost" size="sm">
                              {myAttempt ? "View" : "Start"}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {assignments.length === 0 && !loading && (
            <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">No modules assigned yet</h3>
              <p className="text-muted-foreground text-sm">Your admin will assign training modules to you.</p>
            </Card>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">My Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0}%</span>
                </div>
                <Progress value={totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{totalAssigned - completedCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Remaining</p>
                </div>
              </div>

              {pendingReview > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pendingReview} submission{pendingReview !== 1 ? "s" : ""} pending review</span>
                </div>
              )}

              <Link href="/learner/progress">
                <Button variant="outline" className="w-full text-sm">
                  <Trophy className="w-4 h-4 mr-2" /> View Full Progress
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </LearnerLayout>
  );
}
