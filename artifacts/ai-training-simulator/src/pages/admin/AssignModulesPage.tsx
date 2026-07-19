import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Search, UserPlus, UserMinus, BookOpen, Users,
  CheckCircle2, AlertCircle, Loader2, Calendar, ChevronLeft, Check,
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

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function AssignModulesPage() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get("moduleId") ? parseInt(urlParams.get("moduleId")!) : null;

  const [modules, setModules] = useState<Module[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(preselectedId);
  const [moduleSearch, setModuleSearch] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");

  // Multi-select state
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<number>>(new Set());

  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [unassignBusy, setUnassignBusy] = useState<Set<number>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [showDueDateInput, setShowDueDateInput] = useState(false);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
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

  // Clear selection when module changes
  useEffect(() => {
    setSelectedLearnerIds(new Set());
    setDueDate("");
    setShowDueDateInput(false);
  }, [selectedModuleId]);

  const selectedModule = modules.find(m => m.moduleId === selectedModuleId) ?? null;

  const visibleModules = selectedModuleId
    ? modules.filter(m => m.moduleId === selectedModuleId)
    : modules.filter(m => {
        const q = moduleSearch.toLowerCase();
        return !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      });

  const filteredLearners = members.filter(m => {
    const q = learnerSearch.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  const assignmentFor = (learnerId: number) =>
    assignments.find(a => a.moduleId === selectedModuleId && a.learnerId === learnerId) ?? null;

  const assignedCount = selectedModuleId
    ? assignments.filter(a => a.moduleId === selectedModuleId).length
    : 0;

  // Toggle a learner in the selection (only unassigned learners are selectable)
  const toggleLearner = (learnerId: number) => {
    if (assignmentFor(learnerId)) return; // already assigned, not selectable
    setSelectedLearnerIds(prev => {
      const next = new Set(prev);
      if (next.has(learnerId)) next.delete(learnerId);
      else next.add(learnerId);
      return next;
    });
  };

  // Select all visible unassigned learners
  const selectAll = () => {
    const ids = filteredLearners.filter(l => !assignmentFor(l.userId)).map(l => l.userId);
    setSelectedLearnerIds(new Set(ids));
  };

  const clearSelection = () => setSelectedLearnerIds(new Set());

  // Confirm and assign selected learners
  const handleAssignSelected = async () => {
    if (!selectedModuleId || !orgId || selectedLearnerIds.size === 0) return;
    setAssigning(true);
    let successCount = 0;
    for (const learnerId of selectedLearnerIds) {
      try {
        const r = await fetch(`${base}/api/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orgId, moduleId: selectedModuleId, learnerId, dueDate: dueDate || null }),
        });
        if (r.ok) {
          const created = await r.json();
          setAssignments(prev => [...prev, { assignmentId: created.assignmentId, moduleId: selectedModuleId, learnerId, dueDate: dueDate || null }]);
          successCount++;
        }
      } catch {}
    }
    setSelectedLearnerIds(new Set());
    setDueDate("");
    setShowDueDateInput(false);
    setAssigning(false);
    showToast("ok", `Assigned ${successCount} learner${successCount !== 1 ? "s" : ""}`);
  };

  // Unassign a single already-assigned learner (immediate, no selection needed)
  const handleUnassign = async (learner: Member) => {
    const existing = assignmentFor(learner.userId);
    if (!existing) return;
    setUnassignBusy(prev => new Set(prev).add(learner.userId));
    try {
      await fetch(`${base}/api/assignments/${existing.assignmentId}`, {
        method: "DELETE", credentials: "include",
      });
      setAssignments(prev => prev.filter(a => a.assignmentId !== existing.assignmentId));
      showToast("ok", `Unassigned ${learner.name}`);
    } catch {
      showToast("err", "Failed to unassign");
    } finally {
      setUnassignBusy(prev => { const s = new Set(prev); s.delete(learner.userId); return s; });
    }
  };

  const unassignedFiltered = filteredLearners.filter(l => !assignmentFor(l.userId));
  const allVisibleSelected = unassignedFiltered.length > 0 && unassignedFiltered.every(l => selectedLearnerIds.has(l.userId));

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
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
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
        <p className="text-muted-foreground mt-1">Select a module, pick learners, then confirm the assignment.</p>
      </div>

      <div className="flex gap-5 h-[calc(100vh-11rem)]">

        {/* ── Left: module list ── */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          {!selectedModuleId ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={moduleSearch}
                onChange={e => setModuleSearch(e.target.value)}
                placeholder="Search modules…"
                className="pl-9"
              />
            </div>
          ) : (
            <button
              onClick={() => { setSelectedModuleId(null); setModuleSearch(""); setLearnerSearch(""); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Change module
            </button>
          )}

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {visibleModules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No modules found.</p>
            )}
            {visibleModules.map(mod => {
              const isSelected = mod.moduleId === selectedModuleId;
              const count = assignments.filter(a => a.moduleId === mod.moduleId).length;
              return (
                <button
                  key={mod.moduleId}
                  onClick={() => { if (!isSelected) { setSelectedModuleId(mod.moduleId); setLearnerSearch(""); } }}
                  className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30 cursor-default"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <p className={`text-sm font-semibold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {mod.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.category}</p>
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

        {/* ── Right: learner panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedModule ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-xl">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-semibold text-foreground mb-1">Select a module</p>
              <p className="text-sm text-muted-foreground">Choose a module on the left to manage assignments.</p>
            </div>
          ) : (
            <>
              {/* Module header */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Assigning</p>
                <h2 className="text-xl font-bold text-foreground">{selectedModule.title}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {assignedCount} of {members.length} learner{members.length !== 1 ? "s" : ""} assigned
                </p>
              </div>

              {/* Search + select-all row */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={learnerSearch}
                    onChange={e => { setLearnerSearch(e.target.value); setSelectedLearnerIds(new Set()); }}
                    placeholder="Filter by name or email…"
                    className="pl-9"
                  />
                </div>
                {unassignedFiltered.length > 0 && (
                  <button
                    onClick={allVisibleSelected ? clearSelection : selectAll}
                    className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                  >
                    {allVisibleSelected ? "Deselect all" : `Select all (${unassignedFiltered.length})`}
                  </button>
                )}
              </div>

              {/* Learner rows — scrollable area */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2">
                {filteredLearners.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-border rounded-xl">
                    <Users className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {learnerSearch ? "No learners match that search." : "No learners yet. Add them in Account Management."}
                    </p>
                  </div>
                )}

                {filteredLearners.map(learner => {
                  const existing = assignmentFor(learner.userId);
                  const isAssigned = !!existing;
                  const isSelected = selectedLearnerIds.has(learner.userId);
                  const isBusyUnassign = unassignBusy.has(learner.userId);

                  return (
                    <div
                      key={learner.userId}
                      onClick={() => !isAssigned && toggleLearner(learner.userId)}
                      className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-all select-none ${
                        isAssigned
                          ? "border-emerald-500/30 bg-emerald-500/5 cursor-default"
                          : isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/20 cursor-pointer"
                            : "border-border bg-card hover:border-primary/30 hover:bg-muted/20 cursor-pointer"
                      }`}
                    >
                      {/* Checkbox / avatar */}
                      <div className="shrink-0 relative">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base transition-all ${
                          isAssigned
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/15 text-primary"
                        }`}>
                          {isSelected && !isAssigned
                            ? <Check className="w-5 h-5" />
                            : initials(learner.name)
                          }
                        </div>
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-semibold leading-tight truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {learner.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {learner.email ?? "—"}
                        </p>
                        {isAssigned && existing?.dueDate && (
                          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Due {fmt(existing.dueDate)}
                          </p>
                        )}
                      </div>

                      {/* Right side */}
                      {isAssigned ? (
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                            Assigned
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusyUnassign}
                            onClick={e => { e.stopPropagation(); handleUnassign(learner); }}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                          >
                            {isBusyUnassign
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <><UserMinus className="w-4 h-4 mr-1.5" /> Unassign</>
                            }
                          </Button>
                        </div>
                      ) : (
                        <div className="shrink-0">
                          {isSelected
                            ? <span className="text-xs font-medium text-primary">Selected</span>
                            : <span className="text-xs text-muted-foreground">Click to select</span>
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Sticky assignment bar ── */}
              {selectedLearnerIds.size > 0 && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedLearnerIds.size} learner{selectedLearnerIds.size !== 1 ? "s" : ""} selected
                    </p>
                    {showDueDateInput ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <input
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {dueDate && (
                          <button onClick={() => setDueDate("")} className="text-xs text-muted-foreground hover:text-foreground">
                            Clear
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDueDateInput(true)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 transition-colors"
                      >
                        <Calendar className="w-3 h-3" /> Add due date (optional)
                      </button>
                    )}
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleAssignSelected}
                    disabled={assigning}
                    className="shrink-0"
                  >
                    {assigning
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning…</>
                      : <><UserPlus className="w-4 h-4 mr-2" /> Assign {selectedLearnerIds.size}</>
                    }
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
