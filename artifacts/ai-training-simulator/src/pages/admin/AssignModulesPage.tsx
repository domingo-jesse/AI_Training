import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Search, UserPlus, UserMinus, BookOpen, Users,
  CheckCircle2, AlertCircle, Loader2, Calendar, ChevronRight,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

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

interface Assignment {
  assignmentId: number;
  moduleId: number;
  learnerId: number;
  dueDate: string | null;
}

const DIFF_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  advanced:     "bg-red-500/20 text-red-400 border-red-500/30",
};

function fmt(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AssignModulesPage() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.organizationId;

  // Read ?moduleId= from URL
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get("moduleId") ? parseInt(urlParams.get("moduleId")!) : null;

  const [modules, setModules] = useState<Module[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(preselectedId);
  const [moduleSearch, setModuleSearch] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [dueDates, setDueDates] = useState<Record<number, string>>({});
  const [showDateFor, setShowDateFor] = useState<number | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      fetch(`${base}/api/modules?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/organizations/${orgId}/members`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/assignments?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([mods, mem, asgn]) => {
      setModules(Array.isArray(mods) ? mods : []);
      setMembers(Array.isArray(mem) ? mem.filter((u: Member) => u.role === "learner") : []);
      setAssignments(Array.isArray(asgn) ? asgn : []);
    }).finally(() => setLoading(false));
  }, [orgId]);

  const selectedModule = modules.find(m => m.moduleId === selectedModuleId) ?? null;

  const filteredModules = modules.filter(m => {
    const q = moduleSearch.toLowerCase();
    return !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const filteredLearners = members.filter(m => {
    const q = learnerSearch.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  // Find existing assignment for this learner+module
  const assignmentFor = (learnerId: number) =>
    assignments.find(a => a.moduleId === selectedModuleId && a.learnerId === learnerId) ?? null;

  const assignedCount = selectedModuleId
    ? assignments.filter(a => a.moduleId === selectedModuleId).length
    : 0;

  const handleAssign = async (learner: Member) => {
    if (!selectedModuleId || !orgId) return;
    const existing = assignmentFor(learner.userId);
    setBusy(prev => new Set(prev).add(learner.userId));
    try {
      if (existing) {
        // Unassign
        await fetch(`${base}/api/assignments/${existing.assignmentId}`, {
          method: "DELETE", credentials: "include",
        });
        setAssignments(prev => prev.filter(a => a.assignmentId !== existing.assignmentId));
        showToast("ok", `Unassigned ${learner.name}`);
      } else {
        // Assign
        const dueDate = dueDates[learner.userId] || null;
        const r = await fetch(`${base}/api/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orgId, moduleId: selectedModuleId, learnerId: learner.userId, dueDate }),
        });
        if (!r.ok) throw new Error(await r.text());
        const created = await r.json();
        setAssignments(prev => [...prev, { assignmentId: created.assignmentId, moduleId: selectedModuleId, learnerId: learner.userId, dueDate }]);
        setShowDateFor(null);
        showToast("ok", `Assigned ${learner.name}`);
      }
    } catch (e: any) {
      showToast("err", e.message ?? "Failed");
    } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(learner.userId); return s; });
    }
  };

  const handleAssignAll = async () => {
    if (!selectedModuleId || !orgId) return;
    const unassigned = filteredLearners.filter(l => !assignmentFor(l.userId));
    if (!unassigned.length) return;
    if (!confirm(`Assign "${selectedModule?.title}" to all ${unassigned.length} unassigned learner(s)?`)) return;

    for (const learner of unassigned) {
      setBusy(prev => new Set(prev).add(learner.userId));
      try {
        const r = await fetch(`${base}/api/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orgId, moduleId: selectedModuleId, learnerId: learner.userId, dueDate: null }),
        });
        if (r.ok) {
          const created = await r.json();
          setAssignments(prev => [...prev, { assignmentId: created.assignmentId, moduleId: selectedModuleId, learnerId: learner.userId, dueDate: null }]);
        }
      } catch {}
      setBusy(prev => { const s = new Set(prev); s.delete(learner.userId); return s; });
    }
    showToast("ok", `Assigned to ${unassigned.length} learner(s)`);
  };

  if (loading) {
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
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${
          toast.type === "ok"
            ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
            : "bg-red-950 border-red-500/40 text-red-300"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Assign Modules</h1>
        <p className="text-muted-foreground mt-1">Pick a module, then assign it to learners in your organization.</p>
      </div>

      <div className="flex gap-5 h-[calc(100vh-11rem)]">

        {/* ── Left: module list ── */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              placeholder="Search modules…"
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredModules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No modules found.</p>
            )}
            {filteredModules.map(mod => {
              const isSelected = mod.moduleId === selectedModuleId;
              const count = assignments.filter(a => a.moduleId === mod.moduleId).length;
              return (
                <button
                  key={mod.moduleId}
                  onClick={() => { setSelectedModuleId(mod.moduleId); setLearnerSearch(""); }}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {mod.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.category}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-xs ${DIFF_COLORS[mod.difficulty] ?? ""}`}>
                      {mod.difficulty}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${mod.status === "published" ? "border-emerald-500/30 text-emerald-400" : "border-muted-foreground/30 text-muted-foreground"}`}>
                      {mod.status}
                    </Badge>
                    {count > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: learner assignment panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedModule ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-xl">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-semibold text-foreground mb-1">Select a module</p>
              <p className="text-sm text-muted-foreground">Choose a module on the left to manage its assignments.</p>
            </div>
          ) : (
            <>
              {/* Module detail header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedModule.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {assignedCount} of {members.length} learner{members.length !== 1 ? "s" : ""} assigned
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {filteredLearners.some(l => !assignmentFor(l.userId)) && (
                    <Button variant="outline" size="sm" onClick={handleAssignAll}>
                      <UserPlus className="w-4 h-4 mr-1.5" /> Assign All
                    </Button>
                  )}
                </div>
              </div>

              {/* Learner search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={learnerSearch}
                  onChange={e => setLearnerSearch(e.target.value)}
                  placeholder="Search learners…"
                  className="pl-9"
                />
              </div>

              {/* Learner rows */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredLearners.length === 0 && (
                  <Card className="flex flex-col items-center justify-center py-14 text-center border-dashed">
                    <Users className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No learners found. Add learners in Account Management.</p>
                  </Card>
                )}

                {filteredLearners.map(learner => {
                  const existing = assignmentFor(learner.userId);
                  const isAssigned = !!existing;
                  const isBusy = busy.has(learner.userId);
                  const showDatePicker = showDateFor === learner.userId && !isAssigned;

                  return (
                    <Card
                      key={learner.userId}
                      className={`border transition-colors ${isAssigned ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}
                    >
                      <CardContent className="flex items-center gap-4 py-3 px-4">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                          {learner.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{learner.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{learner.email ?? "—"}</p>
                          {isAssigned && existing?.dueDate && (
                            <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Due {fmt(existing.dueDate)}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        {isAssigned && (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs shrink-0">
                            Assigned
                          </Badge>
                        )}

                        {/* Due date picker (shown before assigning) */}
                        {showDatePicker && (
                          <input
                            type="date"
                            value={dueDates[learner.userId] ?? ""}
                            onChange={e => setDueDates(prev => ({ ...prev, [learner.userId]: e.target.value }))}
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isAssigned && !showDatePicker && (
                            <button
                              type="button"
                              onClick={() => setShowDateFor(learner.userId)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Due date
                            </button>
                          )}
                          <Button
                            size="sm"
                            variant={isAssigned ? "outline" : "default"}
                            disabled={isBusy}
                            onClick={() => handleAssign(learner)}
                            className={isAssigned
                              ? "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                              : ""}
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isAssigned ? (
                              <><UserMinus className="w-4 h-4 mr-1.5" /> Unassign</>
                            ) : (
                              <><UserPlus className="w-4 h-4 mr-1.5" /> Assign</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
