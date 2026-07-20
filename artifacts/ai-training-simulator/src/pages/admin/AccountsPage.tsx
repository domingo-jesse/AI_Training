import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, UserPlus, RefreshCw, AlertCircle, X,
  ShieldOff, ShieldCheck, Pencil, Check, CheckCircle2, Search,
  ChevronDown, ChevronRight, Tag, Upload, FileText, Trash2,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─────────────────────────────────────────────────────────────── types ── */
interface AdminUser {
  userId: number;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean | null;
  createdAt: string | null;
  authProvider: string | null;
  membershipId: string;
  membershipRole: string;
  membershipStatus: string;
}

interface Group { groupId: number; name: string; color: string; members: { userId: number }[] }

interface CsvRow { name: string; email: string; role: string }
interface BulkResult { email: string; name: string; status: "created" | "existing" | "error"; error?: string }

const ROLE_OPTIONS = ["learner", "manager", "admin", "owner"] as const;
type Role = typeof ROLE_OPTIONS[number];

const ROLE_STYLE: Record<string, string> = {
  owner:   "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40",
  admin:   "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40",
  manager: "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40",
  learner: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
};

/* ────────────────────────────────────────────────────── small components ── */
function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0 select-none">
      {initials}
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${ROLE_STYLE[role] ?? "bg-muted text-muted-foreground ring-border"}`}>
      {role}
    </span>
  );
}

function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; description: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${danger ? "bg-red-500/15" : "bg-primary/15"}`}>
          <ShieldOff className={`w-5 h-5 ${danger ? "text-red-400" : "text-primary"}`} />
        </div>
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className={danger ? "bg-red-500 hover:bg-red-600 text-white border-0" : ""} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── CSV parsing utility ── */
function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect and skip header
  const firstLower = lines[0].toLowerCase();
  const hasHeader = firstLower.includes("name") || firstLower.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map(line => {
      // Handle quoted fields
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const email = (cols[1] ?? cols[0] ?? "").toLowerCase().trim();
      const name = cols[1] ? (cols[0] ?? "").trim() : "";
      const roleRaw = (cols[2] ?? "").toLowerCase().trim();
      const role = ROLE_OPTIONS.includes(roleRaw as Role) ? roleRaw : "learner";
      return { name: name || email.split("@")[0], email, role };
    })
    .filter(r => r.email.includes("@"));
}

/* ─────────────────────────────────────── BulkImportPanel ── */
function BulkImportPanel({ orgId, onClose, onDone }: { orgId: number; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [error, setError] = useState("");
  const [defaultRole, setDefaultRole] = useState<Role>("learner");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setError("");
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target?.result as string ?? "");
      if (parsed.length === 0) { setError("No valid rows found. Make sure columns are: name, email, role"); return; }
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".csv")) { setError("Please upload a .csv file"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target?.result as string ?? "");
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const updateRole = (idx: number, role: string) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, role } : r));

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const applyDefaultRole = () => setRows(prev => prev.map(r => ({ ...r, role: defaultRole })));

  const submit = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${base}/api/admin/users/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, users: rows }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Import failed");
      setResults(data.results);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const summary = results ? {
    created: results.filter(r => r.status === "created").length,
    existing: results.filter(r => r.status === "existing").length,
    errors: results.filter(r => r.status === "error").length,
  } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Bulk Import Users
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV with columns: name, email, role</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Results view */}
          {results ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Created", value: summary!.created, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                  { label: "Already existed", value: summary!.existing, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                  { label: "Errors", value: summary!.errors, color: "text-red-400 bg-red-500/10 border-red-500/20" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border px-4 py-3 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Per-row results */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    r.status === "created"  ? "bg-emerald-500/8 border border-emerald-500/15" :
                    r.status === "existing" ? "bg-blue-500/8 border border-blue-500/15" :
                    "bg-red-500/8 border border-red-500/15"
                  }`}>
                    {r.status === "created"  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
                     r.status === "existing" ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> :
                     <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="flex-1 truncate">{r.name ? `${r.name} · ` : ""}{r.email}</span>
                    <span className="text-xs capitalize opacity-70">{r.status === "existing" ? "already in org" : r.status}{r.error ? `: ${r.error}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              {rows.length === 0 ? (
                <div
                  className="border-2 border-dashed border-border/60 rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                >
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Columns: <code className="bg-muted px-1 rounded">name, email, role</code></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Role defaults to <em>learner</em> if omitted. Max 500 rows.</p>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                </div>
              ) : (
                <>
                  {/* File info + default role */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate max-w-[180px]">{fileName}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Set all to:</span>
                      <select
                        value={defaultRole}
                        onChange={e => setDefaultRole(e.target.value as Role)}
                        className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applyDefaultRole}>Apply</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRows([]); setFileName(""); }}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Preview table */}
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b border-border/50">
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Email</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">Role</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 max-h-56 overflow-y-auto">
                        {rows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-3 py-2">
                              <input
                                value={row.name}
                                onChange={e => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))}
                                className="w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
                                placeholder="Name"
                              />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[160px]">{row.email}</td>
                            <td className="px-3 py-2">
                              <select
                                value={row.role}
                                onChange={e => updateRole(i, e.target.value)}
                                className="w-full h-6 rounded border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {rows.length > 50 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground text-center">
                              + {rows.length - 50} more rows (all will be imported)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center gap-3">
          {results ? (
            <>
              <Button size="sm" variant="outline" onClick={() => { setResults(null); setRows([]); setFileName(""); }}>
                Import another file
              </Button>
              <Button size="sm" className="ml-auto" onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                size="sm" className="ml-auto"
                disabled={rows.length === 0 || loading}
                onClick={submit}
              >
                {loading
                  ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Importing…</>
                  : <><Upload className="w-3.5 h-3.5 mr-1.5" />Import {rows.length} user{rows.length !== 1 ? "s" : ""}</>
                }
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────── AccountsPage ── */
export default function AccountsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [users,  setUsers]  = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [addForm,  setAddForm]  = useState({ name: "", email: "", role: "learner" as Role });
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg,   setAddMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editDraft,  setEditDraft]  = useState({ name: "", email: "", role: "learner" as Role, groupIds: new Set<number>() });
  const [patchingId, setPatchingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null);
  const [search,    setSearch]    = useState("");
  const [inactiveOpen, setInactiveOpen] = useState(false);

  const load = () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${base}/api/admin/users?orgId=${orgId}`, { credentials: "include" })
        .then(r => { if (!r.ok) throw new Error(`Failed (${r.status})`); return r.json(); }),
      fetch(`${base}/api/groups?orgId=${orgId}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([u, g]) => { setUsers(u); setGroups(Array.isArray(g) ? g : []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (orgId) load(); }, [orgId]);

  const patch = async (userId: number, updates: object) => {
    setPatchingId(userId);
    try {
      const r = await fetch(`${base}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, ...updates }),
      });
      if (!r.ok) throw new Error(await r.text());
      const updated: AdminUser = await r.json();
      setUsers(prev => prev.map(u => u.userId === userId ? updated : u));
      return true;
    } catch (e: any) {
      alert(e.message);
      return false;
    } finally {
      setPatchingId(null);
    }
  };

  const syncGroups = async (userId: number, nextGroupIds: Set<number>) => {
    const currentGroupIds = new Set(groups.filter(g => g.members.some(m => m.userId === userId)).map(g => g.groupId));
    const toAdd    = [...nextGroupIds].filter(id => !currentGroupIds.has(id));
    const toRemove = [...currentGroupIds].filter(id => !nextGroupIds.has(id));
    await Promise.all([
      ...toAdd.map(gid => fetch(`${base}/api/groups/${gid}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userId }) })),
      ...toRemove.map(gid => fetch(`${base}/api/groups/${gid}/members/${userId}`, { method: "DELETE", credentials: "include" })),
    ]);
    setGroups(prev => prev.map(g => {
      if (toAdd.includes(g.groupId)) return { ...g, members: [...g.members, { userId }] };
      if (toRemove.includes(g.groupId)) return { ...g, members: g.members.filter(m => m.userId !== userId) };
      return g;
    }));
  };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !orgId) { setAddMsg({ type: "err", text: "Name and email are required." }); return; }
    setAddLoading(true);
    setAddMsg(null);
    try {
      const r = await fetch(`${base}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, ...addForm }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Failed");
      setUsers(prev => {
        const exists = prev.find(u => u.userId === body.userId);
        return exists ? prev.map(u => u.userId === body.userId ? body : u) : [...prev, body];
      });
      setAddMsg({ type: "ok", text: `${body.name} added as ${addForm.role}.` });
      setAddForm({ name: "", email: "", role: "learner" });
    } catch (e: any) {
      setAddMsg({ type: "err", text: e.message });
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    const currentGroupIds = new Set(groups.filter(g => g.members.some(m => m.userId === u.userId)).map(g => g.groupId));
    setEditDraft({ name: u.name, email: u.email ?? "", role: u.membershipRole as Role, groupIds: currentGroupIds });
    setEditingId(u.userId);
  };

  const saveEdit = async (userId: number) => {
    const { groupIds, ...userFields } = editDraft;
    const ok = await patch(userId, userFields);
    if (!ok) return;
    await syncGroups(userId, groupIds);
    setEditingId(null);
  };

  const toggleGroup = (groupId: number) =>
    setEditDraft(d => { const next = new Set(d.groupIds); next.has(groupId) ? next.delete(groupId) : next.add(groupId); return { ...d, groupIds: next }; });

  const allActive = users.filter(u => u.isActive !== false && u.membershipStatus === "active");
  const inactive  = users.filter(u => u.isActive === false || u.membershipStatus === "inactive");
  const q = search.toLowerCase();
  const active = allActive.filter(u => !q || u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || u.membershipRole.toLowerCase().includes(q));
  const userGroups = (userId: number) => groups.filter(g => g.members.some(m => m.userId === userId));

  if (orgLoading) return (
    <AdminLayout><div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" /></div></AdminLayout>
  );

  if (!currentOrg) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <ConfirmDialog
        open={confirmTarget !== null}
        title="Deactivate user?"
        description={`${confirmTarget?.name} won't be able to sign in until reactivated.`}
        confirmLabel="Deactivate" danger
        onConfirm={() => { patch(confirmTarget!.userId, { isActive: false }); setConfirmTarget(null); }}
        onCancel={() => setConfirmTarget(null)}
      />

      {showBulk && orgId && (
        <BulkImportPanel
          orgId={orgId}
          onClose={() => setShowBulk(false)}
          onDone={load}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Account Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentOrg.organizationName} · {allActive.length} active{inactive.length > 0 ? ` · ${inactive.length} deactivated` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, role…"
              className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm w-48 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowBulk(true); setShowAdd(false); }}>
            <Upload className="w-4 h-4 mr-1.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => { setShowAdd(v => !v); setAddMsg(null); }}>
            {showAdd ? <X className="w-4 h-4 mr-1.5" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
            {showAdd ? "Cancel" : "Add User"}
          </Button>
        </div>
      </div>

      {/* Add user form */}
      {showAdd && (
        <Card className="mb-5 border-primary/20">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-medium">New user — {currentOrg.organizationName}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Full name *</Label>
                <Input placeholder="Jane Smith" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email *</Label>
                <Input type="email" placeholder="jane@example.com" value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleAdd()} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
            </div>
            {addMsg && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${addMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {addMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {addMsg.text}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={addLoading || !addForm.name.trim() || !addForm.email.trim()}>
                {addLoading && <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />}
                Add User
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddMsg(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={load}>Retry</Button>
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" /></div>}

      {!loading && !error && (
        <div className="space-y-4">
          {/* Active users */}
          {active.length === 0 && !showAdd ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium mb-1">No active users</p>
              <p className="text-sm text-muted-foreground mb-4">Add users one at a time or bulk import from a spreadsheet.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAdd(true)}><UserPlus className="w-4 h-4 mr-1.5" /> Add User</Button>
                <Button size="sm" variant="outline" onClick={() => setShowBulk(true)}><Upload className="w-4 h-4 mr-1.5" /> Import CSV</Button>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader className="px-5 py-3.5 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Active Users
                  <span className="text-muted-foreground font-normal">({active.length})</span>
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-border/40">
                {active.map(u => {
                  const isEditing = editingId === u.userId;
                  const isSaving  = patchingId === u.userId;
                  const ug        = userGroups(u.userId);
                  return (
                    <div key={u.userId}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                        <Avatar name={u.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{u.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground truncate">
                              {u.authProvider === "pending"
                                ? <span className="text-amber-400">Pending first sign-in</span>
                                : (u.email ?? "—")}
                            </p>
                            {ug.length > 0 && (
                              <div className="flex items-center gap-1">
                                {ug.slice(0, 4).map(g => (
                                  <span key={g.groupId} title={g.name} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                                ))}
                                {ug.length > 4 && <span className="text-xs text-muted-foreground">+{ug.length - 4}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <RolePill role={u.membershipRole} />
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant={isEditing ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Edit" onClick={() => isEditing ? setEditingId(null) : openEdit(u)}>
                            {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10" title="Deactivate" disabled={isSaving} onClick={() => setConfirmTarget(u)}>
                            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="bg-muted/30 border-t border-border/40 px-5 py-4 space-y-4">
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="space-y-1 w-44">
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <Input value={editDraft.name} autoFocus className="h-8 text-sm" onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                            </div>
                            <div className="space-y-1 flex-1 min-w-48">
                              <Label className="text-xs text-muted-foreground">Email</Label>
                              <Input type="email" value={editDraft.email} className="h-8 text-sm" onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1 w-32">
                              <Label className="text-xs text-muted-foreground">Role</Label>
                              <select value={editDraft.role} onChange={e => setEditDraft(d => ({ ...d, role: e.target.value as Role }))}
                                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                                {ROLE_OPTIONS.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Tag className="w-3 h-3" /> Teams</Label>
                            {groups.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No teams yet. Create one on the <a href="/admin/groups" className="underline hover:text-foreground">Groups page</a>.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {groups.map(g => {
                                  const isIn = editDraft.groupIds.has(g.groupId);
                                  return (
                                    <button key={g.groupId} type="button" onClick={() => toggleGroup(g.groupId)}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isIn ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}
                                      style={isIn ? { backgroundColor: g.color, borderColor: g.color } : {}}>
                                      {!isIn && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />}
                                      {isIn && <Check className="w-3 h-3 shrink-0" />}
                                      {g.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-8" disabled={isSaving} onClick={() => saveEdit(u.userId)}>
                              {isSaving ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <Check className="w-3 h-3 mr-1.5" />}Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Deactivated */}
          {inactive.length > 0 && (
            <div className="mt-6">
              <button onClick={() => setInactiveOpen(v => !v)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
                {inactiveOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <ShieldOff className="w-4 h-4" />
                <span className="font-medium">Deactivated</span>
                <span className="px-1.5 py-0.5 rounded-full bg-muted text-xs">{inactive.length}</span>
              </button>
              {inactiveOpen && (
                <Card className="overflow-hidden">
                  <div className="divide-y divide-border/30">
                    {inactive.map(u => (
                      <div key={u.userId} className="flex items-center gap-3 px-5 py-3 opacity-60 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                          {u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground line-through truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground/50 truncate">{u.email ?? "—"}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shrink-0" disabled={patchingId === u.userId} onClick={() => patch(u.userId, { isActive: true })}>
                          {patchingId === u.userId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                          Reactivate
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
