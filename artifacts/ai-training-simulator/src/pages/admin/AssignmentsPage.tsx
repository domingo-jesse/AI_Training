import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  FileText, Plus, Trash2, User, BookOpen, Calendar,
  AlertCircle, CheckCircle2, RefreshCw, X, Search
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

export default function AssignmentsPage() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState({ moduleId: "", learnerId: "", dueDate: "" });
  const [search, setSearch] = useState("");

  const load = () => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      fetch(`${base}/api/assignments?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/modules?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${base}/api/organizations/${orgId}/members`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([a, m, mem]) => {
      setAssignments(Array.isArray(a) ? a : []);
      setModules(Array.isArray(m) ? m.filter((mod: Module & { status?: string }) => mod.status === "published" || !("status" in mod)) : []);
      setMembers(Array.isArray(mem) ? mem.filter((u: Member) => u.role === "learner") : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orgId]);

  const handleCreate = async () => {
    if (!form.moduleId || !form.learnerId || !orgId) {
      setSaveMsg({ type: "err", text: "Module and learner are required." });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch(`${base}/api/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          moduleId: parseInt(form.moduleId),
          learnerId: parseInt(form.learnerId),
          dueDate: form.dueDate || null,
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

  const learnerOptions = members;
  const publishedModules = modules;

  const q = search.toLowerCase();
  const filtered = assignments.filter(a =>
    !q ||
    a.learnerName.toLowerCase().includes(q) ||
    (a.learnerEmail ?? "").toLowerCase().includes(q) ||
    a.moduleTitle.toLowerCase().includes(q)
  );

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Assign training modules to learners in your organization.</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search learner or module…"
              className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm w-52 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={() => { setShowForm(true); setSaveMsg(null); }}>
            <Plus className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>
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
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a module…</option>
                  {publishedModules.map(m => (
                    <option key={m.moduleId} value={m.moduleId}>{m.title}</option>
                  ))}
                </select>
                {publishedModules.length === 0 && (
                  <p className="text-xs text-muted-foreground">No published modules yet. Publish a module first.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Learner *</Label>
                <select
                  value={form.learnerId}
                  onChange={e => setForm(f => ({ ...f, learnerId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a learner…</option>
                  {learnerOptions.map(u => (
                    <option key={u.userId} value={u.userId}>{u.name}{u.email ? ` (${u.email})` : ""}</option>
                  ))}
                </select>
                {learnerOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No learner accounts in your org yet.</p>
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
        <div className="py-16 text-center text-muted-foreground text-sm">
          No assignments match <span className="font-medium">"{search}"</span>.{" "}
          <button className="underline" onClick={() => setSearch("")}>Clear filter</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.assignmentId} className="hover:border-border/80 transition-colors">
              <CardContent className="flex items-center gap-5 py-4 px-6">
                {/* Learner */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 w-44 shrink-0">
                  <p className="text-sm font-medium truncate">{a.learnerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.learnerEmail ?? "—"}</p>
                </div>

                <div className="text-muted-foreground text-sm shrink-0">→</div>

                {/* Module */}
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.moduleTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* find module difficulty */}
                    {(() => {
                      const mod = modules.find(m => m.moduleId === a.moduleId);
                      return mod ? (
                        <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[mod.difficulty] ?? ""}`}>
                          {mod.difficulty}
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Due date */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 w-32">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{a.dueDate ? fmt(a.dueDate) : "No deadline"}</span>
                </div>

                <div className="text-xs text-muted-foreground shrink-0 w-24 text-right">
                  Assigned {fmt(a.assignedAt)}
                </div>

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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
