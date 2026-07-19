import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BarChart2, Users, CheckCircle2, Clock, AlertCircle, Star, BookOpen } from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AttemptRow {
  attemptId: number;
  userId: number;
  moduleId: number;
  attemptState: string;
  resultStatus: string;
  totalScore: number | null;
  submittedAt: string | null;
  learnerName: string;
  moduleTitle: string;
  moduleCategory: string;
}

interface OrgProgress {
  total: number;
  submitted: number;
  graded: number;
  inProgress: number;
  avgScore: number | null;
  attempts: AttemptRow[];
}

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  in_progress: { label: "In Progress",   className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  submitted:   { label: "Pending Review", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  graded:      { label: "Graded",         className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProgressPage() {
  const { currentOrg } = useOrganization();
  const [data, setData] = useState<OrgProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!currentOrg?.organizationId) return;
    setLoading(true);
    fetch(`${base}/api/progress/org?orgId=${currentOrg.organizationId}`, { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.organizationId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const attempts = data?.attempts ?? [];
  const filtered = attempts.filter(a =>
    !search ||
    a.learnerName.toLowerCase().includes(search.toLowerCase()) ||
    a.moduleTitle.toLowerCase().includes(search.toLowerCase())
  );

  // Per-module breakdown
  const byModule: Record<string, { title: string; total: number; graded: number; avgScore: number | null }> = {};
  for (const a of attempts) {
    if (!byModule[a.moduleId]) byModule[a.moduleId] = { title: a.moduleTitle, total: 0, graded: 0, avgScore: null };
    byModule[a.moduleId].total++;
    if (a.attemptState === "graded") byModule[a.moduleId].graded++;
  }
  // compute avg scores per module
  for (const modId of Object.keys(byModule)) {
    const scored = attempts.filter(a => String(a.moduleId) === modId && a.totalScore != null);
    byModule[modId].avgScore = scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + (a.totalScore ?? 0), 0) / scored.length)
      : null;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Progress Tracking</h1>
        <p className="text-muted-foreground mt-1">
          {currentOrg?.organizationName} · Org-wide training analytics
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { icon: BookOpen,     label: "Total Attempts",  value: data?.total ?? 0,     color: "text-primary" },
          { icon: Clock,        label: "In Progress",     value: data?.inProgress ?? 0, color: "text-blue-400" },
          { icon: AlertCircle,  label: "Needs Grading",   value: data?.submitted ?? 0,  color: "text-amber-400" },
          { icon: CheckCircle2, label: "Graded",          value: data?.graded ?? 0,     color: "text-emerald-400" },
          { icon: Star,         label: "Avg Score",       value: data?.avgScore != null ? `${Math.round(data.avgScore)}` : "—", color: "text-violet-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By Module</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(byModule).length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {Object.values(byModule).map(m => (
              <div key={m.title}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <p className="text-sm font-medium truncate flex-1" title={m.title}>{m.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {m.graded}/{m.total} graded
                    </span>
                    {m.avgScore != null && (
                      <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">
                        avg {m.avgScore}
                      </span>
                    )}
                  </div>
                </div>
                <Progress
                  value={m.total > 0 ? (m.graded / m.total) * 100 : 0}
                  className="h-1.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* All attempts table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">All Attempts</CardTitle>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search learner or module…"
              className="h-8 rounded-md border border-input bg-background px-3 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No attempts found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map(a => {
                  const cfg = STATE_CONFIG[a.attemptState] ?? STATE_CONFIG["in_progress"];
                  return (
                    <div key={a.attemptId} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.learnerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.moduleTitle}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {a.totalScore != null && (
                          <span className="text-sm font-semibold">{Math.round(a.totalScore)}</span>
                        )}
                        <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                        <span className="text-xs text-muted-foreground w-16 text-right">{fmt(a.submittedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
