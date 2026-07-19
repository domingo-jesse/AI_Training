import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, UserPlus, RefreshCw, AlertCircle, X,
  ShieldOff, ShieldCheck, Pencil, Check, CheckCircle2,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const ROLE_OPTIONS = ["learner", "manager", "admin", "owner"] as const;
type Role = typeof ROLE_OPTIONS[number];

const ROLE_STYLE: Record<string, string> = {
  owner:   "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  admin:   "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  manager: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25",
  learner: "bg-slate-500/15 text-slate-400 ring-slate-500/25",
};

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

export default function AccountsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "learner" as Role });
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", email: "", role: "learner" as Role });
  const [patchingId, setPatchingId] = useState<number | null>(null);

  const load = () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    fetch(`${base}/api/admin/users?orgId=${orgId}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Failed (${r.status})`); return r.json(); })
      .then(setUsers)
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

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !orgId) {
      setAddMsg({ type: "err", text: "Name and email are required." });
      return;
    }
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
    setEditDraft({ name: u.name, email: u.email ?? "", role: u.membershipRole as Role });
    setEditingId(u.userId);
  };

  const saveEdit = async (userId: number) => {
    const ok = await patch(userId, editDraft);
    if (ok) setEditingId(null);
  };

  const active = users.filter(u => u.isActive !== false && u.membershipStatus === "active");
  const inactive = users.filter(u => u.isActive === false || u.membershipStatus === "inactive");

  if (orgLoading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    </AdminLayout>
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
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Account Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentOrg.organizationName} · {active.length} active{inactive.length > 0 ? ` · ${inactive.length} deactivated` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => { setShowAdd(v => !v); setAddMsg(null); }}>
            {showAdd ? <X className="w-4 h-4 mr-1.5" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
            {showAdd ? "Cancel" : "Add User"}
          </Button>
        </div>
      </div>

      {/* ── Add user form ── */}
      {showAdd && (
        <Card className="mb-5 border-primary/20">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-medium">New user — {currentOrg.organizationName}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Full name *</Label>
                <Input placeholder="Jane Smith" value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
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

      {/* ── Error ── */}
      {error && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={load}>Retry</Button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">

          {/* ── Active users ── */}
          {active.length === 0 && !showAdd ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium mb-1">No active users</p>
              <p className="text-sm text-muted-foreground mb-4">Add someone to get started.</p>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Add User
              </Button>
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
                  const isSaving = patchingId === u.userId;
                  return (
                    <div key={u.userId}>
                      {/* Row */}
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                        <Avatar name={u.name} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{u.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {u.authProvider === "pending" ? <span className="text-amber-400">Pending first sign-in</span> : (u.email ?? "—")}
                          </p>
                        </div>

                        <RolePill role={u.membershipRole} />

                        <div className="flex items-center gap-1 ml-2">
                          {/* Edit */}
                          <Button
                            variant={isEditing ? "secondary" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            title="Edit user"
                            onClick={() => isEditing ? setEditingId(null) : openEdit(u)}
                          >
                            {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </Button>

                          {/* Deactivate */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            title="Deactivate user"
                            disabled={isSaving}
                            onClick={() => {
                              if (confirm(`Deactivate ${u.name}? They won't be able to sign in.`))
                                patch(u.userId, { isActive: false });
                            }}
                          >
                            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      {/* Edit panel */}
                      {isEditing && (
                        <div className="bg-muted/30 border-t border-border/40 px-5 py-4">
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="space-y-1 w-44">
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <Input value={editDraft.name} autoFocus className="h-8 text-sm"
                                onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                            </div>
                            <div className="space-y-1 flex-1 min-w-48">
                              <Label className="text-xs text-muted-foreground">Email</Label>
                              <Input type="email" value={editDraft.email} className="h-8 text-sm"
                                onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1 w-32">
                              <Label className="text-xs text-muted-foreground">Role</Label>
                              <select value={editDraft.role} onChange={e => setEditDraft(d => ({ ...d, role: e.target.value as Role }))}
                                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                                {ROLE_OPTIONS.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8" disabled={isSaving} onClick={() => saveEdit(u.userId)}>
                                {isSaving ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <Check className="w-3 h-3 mr-1.5" />}
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Deactivated users ── */}
          {inactive.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="px-5 py-3.5 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <ShieldOff className="w-4 h-4" />
                  Deactivated
                  <span className="font-normal">({inactive.length})</span>
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-border/30">
                {inactive.map(u => (
                  <div key={u.userId} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-through truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground/50 truncate">{u.email ?? "—"}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shrink-0"
                      disabled={patchingId === u.userId}
                      onClick={() => patch(u.userId, { isActive: true })}>
                      {patchingId === u.userId
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                      Reactivate
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      )}
    </AdminLayout>
  );
}
