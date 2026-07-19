import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  FileText, Plus, Trash2, User, BookOpen, Calendar,
  AlertCircle, CheckCircle2, RefreshCw, X, Search,
  ChevronDown, SlidersHorizontal,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Assignment {
  assignmentId: number;
  moduleId: number;
  learnerId: number;
  moduleTitle: string;
  learnerName: string;
  learnerEmail: string | null;
  dueDate: string | null;
  assignedAt: string;
  isActive: boolean;
}

interface Module {
  moduleId: number;
  title: string;
  category: string;
  difficulty: string;
  status?: string;
}

interface Member {
  userId: number;
  name: string;
  email: string | null;
  role: string;
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  advanced:     "bg-red-500/20 text-red-400 border-red-500/30",
};

// Due date filter buckets
const DUE_DATE_OPTIONS = [
  { value: "all",      label: "Any due date" },
  { value: "none",     label: "No deadline" },
  { value: "overdue",  label: "Overdue" },
  { value: "today",    label: "Due today" },
  { value: "week",     label: "Due this week" },
  { value: "month",    label: "Due this month" },
  { value: "has_date", label: "Has a deadline" },
];

// Assigned date filter buckets
const ASSIGNED_OPTIONS = [
  { value: "all",   label: "Any time" },
  { value: "today", label: "Assigned today" },
  { value: "week",  label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

function startOf(unit: "day" | "week" | "month") {
  const d = new Date();
  if (unit === "day")   { d.setHours(0, 0, 0, 0); return d; }
  if (unit === "week")  { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  if (unit === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  return d;
}

function endOf(unit: "day") {
  const d = new Date();
  if (unit === "day") { d.setHours(23, 59, 59, 999); return d; }
  return d;
}

// Simple styled select
function FilterSelect({
  value, onChange, options, label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors cursor-pointer ${
          value !== "all" && value !== ""
            ? "border-primary text-primary font-medium"
            : "border-input text-muted-foreground"
        }`}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );
}

export default function AssignmentsPage() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modules, setModules]         = useState<Module[]>([]);
  const [members, setMembers]         = useState<Member[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleting, setDeleting]       = useState<number | null>(null);
  const [form, setForm]               = useState({ moduleId: "", learnerId: "", dueDate: "" });

  // Filters
  const [search,      setSearch]      = useState("");
  const [filterUser,  setFilterUser]  = useState("all");
  const [filterModule,setFilterModule]= useState("all");
  const [filterDue,   setFilterDue]   = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");

  const activeFilterCount = [
    search.trim() !== "",
    filterUser    !== "all",
    filterModule  !== "all",
    filterDue     !== "all",
    filterAssigned !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setFilterUser("all"); setFilterModule("all");
    setFilterDue("all"); setFilterAssigned("all");
  };

  const load = () => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      fetch(`${base}/api/assignments?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/modules?orgId=${orgId}`,     { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/organizations/${orgId}/members`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([a, m, mem]) => {
      setAssignments(Array.isArray(a)   ? a   : []);
      setModules(Array.isArray(m)       ? m   : []);
      setMembers(Array.isArray(mem)     ? mem.filter((u: Member) => u.role === "learner") : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orgId]);

  const handleCreate = async () => {
    if (!form.moduleId || !form.learnerId || !orgId) {
      setSaveMsg({ type: "err", text: "Module and learner are required." });
      return;
    }
    setSaving(true); setSaveMsg(null);
    try {
      const r = await fetch(`${base}/api/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          moduleId:  parseInt(form.moduleId),
          learnerId: parseInt(form.learnerId),
          dueDate:   form.dueDate || null,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setSaveMsg({ type: "ok", text: "Module assigned successfully." });
      setForm({ moduleId: "", learnerId: "", dueDate: "" });
      setShowForm(false);
      load();
    } catch (e: any) {
      setSaveMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this assignment?")) return;
    setDeleting(id);
    try {
      await fetch(`${base}/api/assignments/${id}`, { method: "DELETE", credentials: "include" });
      setAssignments(prev => prev.filter(a => a.assignmentId !== id));
    } finally {
      setDeleting(null);
    }
  };

  // Unique learner options from current assignments (for user filter dropdown)
  const learnerOptions = useMemo(() => {
    const seen = new Map<number, string>();
    assignments.forEach(a => { if (!seen.has(a.learnerId)) seen.set(a.learnerId, a.learnerName); });
    return Array.from(seen.entries()).map(([id, name]) => ({ value: String(id), label: name }));
  }, [assignments]);

  // Unique module options from current assignments (for module filter dropdown)
  const moduleOptions = useMemo(() => {
    const seen = new Map<number, string>();
    assignments.forEach(a => { if (!seen.has(a.moduleId)) seen.set(a.moduleId, a.moduleTitle); });
    return Array.from(seen.entries()).map(([id, title]) => ({ value: String(id), label: title }));
  }, [assignments]);

  const filtered = useMemo(() => {
    const now = new Date();
    const q   = search.trim().toLowerCase();

    return assignments.filter(a => {
      // Text search
      if (q && !a.learnerName.toLowerCase().includes(q) &&
               !(a.learnerEmail ?? "").toLowerCase().includes(q) &&
               !a.moduleTitle.toLowerCase().includes(q)) return false;

      // User filter
      if (filterUser !== "all" && String(a.learnerId) !== filterUser) return false;

      // Module filter
      if (filterModule !== "all" && String(a.moduleId) !== filterModule) return false;

      // Due date filter
      if (filterDue !== "all") {
        const due = a.dueDate ? new Date(a.dueDate) : null;
        if (filterDue === "none"     && due !== null) return false;
        if (filterDue === "has_date" && due === null) return false;
        if (filterDue === "overdue"  && (!due || due >= now)) return false;
        if (filterDue === "today"    && (!due || due < startOf("day") || due > endOf("day"))) return false;
        if (filterDue === "week"     && (!due || due < now || due > new Date(startOf("week").getTime() + 7 * 86400000))) return false;
        if (filterDue === "month"    && (!due || due < now || due.getMonth() !== now.getMonth())) return false;
      }

      // Assigned date filter
      if (filterAssigned !== "all") {
        const created = new Date(a.assignedAt);
        if (filterAssigned === "today" && created < startOf("day")) return false;
        if (filterAssigned === "week"  && created < new Date(Date.now() - 7  * 86400000)) return false;
        if (filterAssigned === "month" && created < new Date(Date.now() - 30 * 86400000)) return false;
      }

      return true;
    });
  }, [assignments, search, filterUser, filterModule, filterDue, filterAssigned]);

  const publishedModules = modules.filter(m => !m.status || m.status === "active");

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Assignments</h1>
            <p className="text-muted-foreground mt-1">Assign training modules to learners in your organization.</p>
          </div>
          <Button size="sm" onClick={() => { setShowForm(true); setSaveMsg(null); }}>
            <Plus className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl border border-border bg-card">
        {/* Text search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search learner or module…"
            className="h-9 w-full pl-8 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Learner filter */}
        <FilterSelect
          label="User"
          value={filterUser}
          onChange={setFilterUser}
          options={[{ value: "all", label: "All learners" }, ...learnerOptions]}
        />

        {/* Module filter */}
        <FilterSelect
          label="Module"
          value={filterModule}
          onChange={setFilterModule}
          options={[{ value: "all", label: "All modules" }, ...moduleOptions]}
        />

        {/* Due date filter */}
        <FilterSelect
          label="Due date"
          value={filterDue}
          onChange={setFilterDue}
          options={DUE_DATE_OPTIONS}
        />

        {/* Assigned date filter */}
        <FilterSelect
          label="Assigned"
          value={filterAssigned}
          onChange={setFilterAssigned}
          options={ASSIGNED_OPTIONS}
        />

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 whitespace-nowrap"
          >
            <X className="w-3 h-3" />
            Clear {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
          </button>
        )}

        {/* Results count */}
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} of {assignments.length}
        </span>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="py-4 px-5 border-b border-border/50 flex-row items-center justify-between">
            <CardTitle className="text-base">Assign Module to Learner</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Module *</Label>
                <select
                  value={form.moduleId}
                  onChange={e => setForm(f => ({ ...f, moduleId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a module…</option>
                  {publishedModules.map(m => (
                    <option key={m.moduleId} value={m.moduleId}>{m.title}</option>
                  ))}
                </select>
                {publishedModules.length === 0 && (
                  <p className="text-xs text-muted-foreground">No published modules yet.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Learner *</Label>
                <select
                  value={form.learnerId}
                  onChange={e => setForm(f => ({ ...f, learnerId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a learner…</option>
                  {members.map(u => (
                    <option key={u.userId} value={u.userId}>{u.name}{u.email ? ` (${u.email})` : ""}</option>
                  ))}
                </select>
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground">No learner accounts yet.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date (optional)</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            {saveMsg && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${saveMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {saveMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {saveMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Assign Module"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No assignments yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Assign published modules to learners so they can start their training.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create First Assignment
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SlidersHorizontal className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No assignments match your filters.</p>
          <button className="text-sm text-primary underline" onClick={clearFilters}>Clear all filters</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const mod      = modules.find(m => m.moduleId === a.moduleId);
            const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();

            return (
              <div
                key={a.assignmentId}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-border/80 hover:bg-muted/10 transition-colors"
              >
                {/* Learner avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>

                {/* Learner info */}
                <div className="min-w-0 w-44 shrink-0">
                  <p className="text-base font-semibold truncate text-foreground">{a.learnerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.learnerEmail ?? "—"}</p>
                </div>

                <span className="text-muted-foreground text-sm shrink-0">→</span>

                {/* Module icon */}
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>

                {/* Module info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{a.moduleTitle}</p>
                  {mod && (
                    <Badge variant="outline" className={`text-xs capitalize mt-0.5 ${DIFFICULTY_COLORS[mod.difficulty] ?? ""}`}>
                      {mod.difficulty}
                    </Badge>
                  )}
                </div>

                {/* Due date */}
                <div className={`flex items-center gap-1.5 text-sm shrink-0 w-32 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{a.dueDate ? fmt(a.dueDate) : "No deadline"}</span>
                </div>

                {/* Assigned date */}
                <div className="text-xs text-muted-foreground shrink-0 w-28 text-right">
                  Assigned {fmt(a.assignedAt)}
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-400 shrink-0"
                  onClick={() => handleDelete(a.assignmentId)}
                  disabled={deleting === a.assignmentId}
                >
                  {deleting === a.assignmentId
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
