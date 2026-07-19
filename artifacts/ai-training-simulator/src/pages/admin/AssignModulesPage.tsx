import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Search, UserPlus, UserMinus, BookOpen, Users,
  CheckCircle2, AlertCircle, Loader2, Calendar, ChevronLeft, Check, X,
  ChevronDown, Layers,
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

interface Group {
  groupId: number;
  name: string;
  color: string;
  members: { userId: number }[];
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(preselectedId);
  const [moduleSearch, setModuleSearch] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  // Selection: learnerId → due date string (empty = no due date)
  const [selection, setSelection] = useState<Map<number, string>>(new Map());

  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [unassignBusy, setUnassignBusy] = useState<Set<number>>(new Set());

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
      fetch(`${base}/api/groups?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([mods, mem, asgn, grps]) => {
      setModules(Array.isArray(mods) ? mods : []);
      setMembers(Array.isArray(mem) ? mem.filter((u: Member) => u.role === "learner") : []);
      setAssignments(Array.isArray(asgn) ? asgn : []);
      setGroups(Array.isArray(grps) ? grps : []);
    }).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    setSelection(new Map());
  }, [selectedModuleId]);

  const selectedModule = modules.find(m => m.moduleId === selectedModuleId) ?? null;

  const visibleModules = selectedModuleId
    ? modules.filter(m => m.moduleId === selectedModuleId)
    : modules.filter(m => {
        const q = moduleSearch.toLowerCase();
        return !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      });

  const activeGroup = groupFilter ? groups.find(g => g.groupId === groupFilter) ?? null : null;
  const groupMemberIds = activeGroup ? new Set(activeGroup.members.map(m => m.userId)) : null;

  const filteredLearners = members.filter(m => {
    const q = learnerSearch.toLowerCase();
    if (groupMemberIds && !groupMemberIds.has(m.userId)) return false;
    return !q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  const assignmentFor = (learnerId: number) =>
    assignments.find(a => a.moduleId === selectedModuleId && a.learnerId === learnerId) ?? null;

  const assignedCount = selectedModuleId
    ? assignments.filter(a => a.moduleId === selectedModuleId).length
    : 0;

  const toggleLearner = (learnerId: number) => {
    if (assignmentFor(learnerId)) return;
    setSelection(prev => {
      const next = new Map(prev);
      if (next.has(learnerId)) next.delete(learnerId);
      else next.set(learnerId, "");
      return next;
    });
  };

  const setLearnerDueDate = (learnerId: number, date: string) => {
    setSelection(prev => {
      const next = new Map(prev);
      next.set(learnerId, date);
      return next;
    });
  };

  const unassignedFiltered = filteredLearners.filter(l => !assignmentFor(l.userId));
  const allVisibleSelected = unassignedFiltered.length > 0 && unassignedFiltered.every(l => selection.has(l.userId));

  const selectAll = () => {
    setSelection(prev => {
      const next = new Map(prev);
      unassignedFiltered.forEach(l => { if (!next.has(l.userId)) next.set(l.userId, ""); });
      return next;
    });
  };

  const clearSelection = () => setSelection(new Map());

  const handleAssignSelected = async () => {
    if (!selectedModuleId || !orgId || selection.size === 0) return;
    setAssigning(true);
    let successCount = 0;
    for (const [learnerId, dueDate] of selection.entries()) {
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
    setSelection(new Map());
    setAssigning(false);
    showToast("ok", `Assigned ${successCount} learner${successCount !== 1 ? "s" : ""}`);
  };

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
        <p className="text-muted-foreground mt-1">Select a module, pick learners, set due dates, then confirm.</p>
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
                    <Badge variant="outline" className={`text-xs ${mod.status === "active" ? "border-emerald-500/30 text-emerald-400" : "border-muted-foreground/30 text-muted-foreground"}`}>
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

              {/* Search + group filter + select-all */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-36">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={learnerSearch}
                    onChange={e => { setLearnerSearch(e.target.value); }}
                    placeholder="Filter by name or email…"
                    className="pl-9"
                  />
                </div>

                {/* Group filter dropdown */}
                {groups.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setGroupDropdownOpen(o => !o)}
                      className={`flex items-center gap-1.5 h-10 px-3 rounded-md border text-sm transition-all ${
                        activeGroup
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      {activeGroup ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeGroup.color }} />
                          <span className="max-w-24 truncate">{activeGroup.name}</span>
                        </>
                      ) : (
                        <><Layers className="w-3.5 h-3.5" /> Group</>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                    {groupDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-popover border border-border rounded-lg shadow-lg py-1 text-sm">
                        <button
                          onClick={() => { setGroupFilter(null); setGroupDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 ${!groupFilter ? "text-primary font-medium" : "text-foreground"}`}
                        >
                          All learners
                        </button>
                        <div className="border-t border-border my-1" />
                        {groups.map(g => (
                          <button
                            key={g.groupId}
                            onClick={() => { setGroupFilter(g.groupId); setGroupDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 ${groupFilter === g.groupId ? "text-primary font-medium" : "text-foreground"}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                            <span className="truncate flex-1">{g.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{g.members.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {unassignedFiltered.length > 0 && (
                  <button
                    onClick={allVisibleSelected ? clearSelection : selectAll}
                    className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                  >
                    {allVisibleSelected ? "Deselect all" : `Select all (${unassignedFiltered.length})`}
                  </button>
                )}
              </div>

              {/* Active group banner */}
              {activeGroup && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: activeGroup.color + "18", border: `1px solid ${activeGroup.color}40` }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeGroup.color }} />
                  <span style={{ color: activeGroup.color }}>
                    Showing {filteredLearners.length} learner{filteredLearners.length !== 1 ? "s" : ""} in <strong>{activeGroup.name}</strong>
                  </span>
                  <button onClick={() => setGroupFilter(null)} className="ml-auto" style={{ color: activeGroup.color }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Learner rows */}
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
                  const isSelected = selection.has(learner.userId);
                  const learnerDueDate = selection.get(learner.userId) ?? "";
                  const isBusyUnassign = unassignBusy.has(learner.userId);

                  return (
                    <div
                      key={learner.userId}
                      className={`rounded-xl border transition-all ${
                        isAssigned
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/30 hover:bg-muted/20"
                      }`}
                    >
                      {/* Main row */}
                      <div
                        onClick={() => !isAssigned && toggleLearner(learner.userId)}
                        className={`flex items-center gap-4 px-5 py-4 select-none ${!isAssigned ? "cursor-pointer" : "cursor-default"}`}
                      >
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 transition-all ${
                          isAssigned
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/15 text-primary"
                        }`}>
                          {isSelected && !isAssigned ? <Check className="w-5 h-5" /> : initials(learner.name)}
                        </div>

                        {/* Name + email */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-base font-semibold leading-tight truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {learner.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{learner.email ?? "—"}</p>
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
                          <span className={`text-xs shrink-0 ${isSelected ? "text-primary font-medium" : "text-muted-foreground"}`}>
                            {isSelected ? "Selected" : "Click to select"}
                          </span>
                        )}
                      </div>

                      {/* Due date row — shown when selected */}
                      {isSelected && (
                        <div
                          className="flex items-center gap-3 px-5 pb-4 pt-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex items-center gap-2 flex-1">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">Due date</label>
                            <input
                              type="date"
                              value={learnerDueDate}
                              onChange={e => setLearnerDueDate(learner.userId, e.target.value)}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
                            />
                            {learnerDueDate && (
                              <button
                                onClick={() => setLearnerDueDate(learner.userId, "")}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" /> Clear
                              </button>
                            )}
                            {!learnerDueDate && (
                              <span className="text-xs text-muted-foreground italic">Optional — leave blank for no deadline</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Sticky assignment bar ── */}
              {selection.size > 0 && (
                <div className="mt-3 flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {selection.size} learner{selection.size !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Array.from(selection.values()).filter(Boolean).length} of {selection.size} have a due date set
                    </p>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <Button onClick={handleAssignSelected} disabled={assigning} className="shrink-0">
                    {assigning
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning…</>
                      : <><UserPlus className="w-4 h-4 mr-2" /> Assign {selection.size}</>
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
