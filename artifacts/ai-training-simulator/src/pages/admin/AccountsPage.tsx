import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, UserPlus, RefreshCw, AlertCircle, X, CheckCircle2,
  ShieldOff, ShieldCheck, Pencil, Check, ChevronDown,
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

const MEMBERSHIP_ROLE_OPTIONS = ["learner", "manager", "admin", "owner"] as const;
type MembershipRole = typeof MEMBERSHIP_ROLE_OPTIONS[number];

const ROLE_COLORS: Record<string, string> = {
  owner:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  manager: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  learner: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Inline editable name/email cell
function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = async () => {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
          className="h-7 text-sm py-0 px-2 w-44"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={commit} disabled={saving}>
          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-400" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setEditing(false); setDraft(value); }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }
  return (
    <button
      className="group/cell flex items-center gap-1.5 text-left hover:text-primary transition-colors text-sm"
      onClick={() => { setEditing(true); setDraft(value); }}
    >
      {value || <span className="text-muted-foreground italic">—</span>}
      <Pencil className="w-3 h-3 opacity-0 group-hover/cell:opacity-50 transition-opacity shrink-0" />
    </button>
  );
}

export default function AccountsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "learner" as MembershipRole });
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Per-row action state
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

  const patch = async (userId: number, updates: Partial<AdminUser & { role: string }>) => {
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
    } catch (e: any) {
      alert(e.message);
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

  // Partition users
  const active = users.filter(u => u.isActive !== false && u.membershipStatus === "active");
  const inactive = users.filter(u => u.isActive === false || u.membershipStatus === "inactive");

  if (orgLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!currentOrg) {
    return (
      <AdminLayout>
        <div className="mb-8"><h1 className="text-3xl font-display font-bold">Account Management</h1></div>
        <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Organization Found</h2>
          <p className="text-muted-foreground">You are not a member of any organization yet.</p>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Account Management</h1>
          <p className="text-muted-foreground mt-1">
            {currentOrg.organizationName} · {active.length} active · {inactive.length} deactivated
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowAdd(v => !v); setAddMsg(null); }}>
            {showAdd ? <X className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {showAdd ? "Cancel" : "Add User"}
          </Button>
        </div>
      </div>

      {/* Add user form */}
      {showAdd && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="py-4 px-5 border-b border-border/50">
            <CardTitle className="text-base">Add User to {currentOrg.organizationName}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Creates the account immediately. If the user signs in with the same email address, their account will be linked automatically.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Full name *</Label>
                <Input
                  placeholder="Jane Smith"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email address *</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Role</Label>
                <select
                  value={addForm.role}
                  onChange={e => setAddForm(f => ({ ...f, role: e.target.value as MembershipRole }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {MEMBERSHIP_ROLE_OPTIONS.map(r => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {addMsg && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${addMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {addMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {addMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleAdd} disabled={addLoading || !addForm.name.trim() || !addForm.email.trim()}>
                {addLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Add User
              </Button>
              <Button variant="outline" onClick={() => { setShowAdd(false); setAddMsg(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* ── Active users ── */}
          {active.length === 0 && !showAdd ? (
            <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Active Users</h2>
              <p className="text-muted-foreground mb-4">Add someone to get started.</p>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-4 px-5 border-b border-border/50 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Active Users
                  <span className="text-muted-foreground font-normal text-sm">({active.length})</span>
                </CardTitle>
              </CardHeader>

              {/* Column headers */}
              <div className="grid grid-cols-[2.5rem_1fr_1fr_9rem_7rem_6rem_2.5rem] gap-3 px-5 py-2 border-b border-border/40 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <span />
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Added</span>
                <span />
              </div>

              <div className="divide-y divide-border/40">
                {active.map(u => (
                  <div
                    key={u.userId}
                    className="grid grid-cols-[2.5rem_1fr_1fr_9rem_7rem_6rem_2.5rem] gap-3 items-center px-5 py-3 hover:bg-muted/20 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 select-none">
                      {getInitials(u.name)}
                    </div>

                    {/* Editable name */}
                    <div className="min-w-0">
                      <EditableCell value={u.name} onSave={name => patch(u.userId, { name })} />
                      {u.authProvider === "pending" && (
                        <span className="text-xs text-amber-400">Pending sign-in</span>
                      )}
                    </div>

                    {/* Editable email */}
                    <div className="min-w-0">
                      <EditableCell value={u.email ?? ""} onSave={email => patch(u.userId, { email })} />
                    </div>

                    {/* Role dropdown */}
                    <div>
                      {patchingId === u.userId ? (
                        <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                      ) : (
                        <select
                          value={u.membershipRole}
                          onChange={e => patch(u.userId, { role: e.target.value })}
                          className={`h-7 rounded border border-input bg-background px-2 pr-6 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring capitalize cursor-pointer appearance-none ${ROLE_COLORS[u.membershipRole] ?? ""}`}
                        >
                          {MEMBERSHIP_ROLE_OPTIONS.map(r => (
                            <option key={r} value={r} className="bg-background text-foreground capitalize">{r}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Active
                      </Badge>
                    </div>

                    {/* Added date */}
                    <div className="text-xs text-muted-foreground">{fmt(u.createdAt)}</div>

                    {/* Deactivate */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Deactivate user"
                      disabled={patchingId === u.userId}
                      onClick={() => {
                        if (confirm(`Deactivate ${u.name}? They won't be able to sign in.`))
                          patch(u.userId, { isActive: false });
                      }}
                    >
                      <ShieldOff className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Deactivated users ── */}
          {inactive.length > 0 && (
            <Card className="opacity-75">
              <CardHeader className="py-3 px-5 border-b border-border/40">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <ShieldOff className="w-4 h-4" />
                  Deactivated Users ({inactive.length})
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-border/30">
                {inactive.map(u => (
                  <div key={u.userId} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate line-through">{u.name}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">{u.email ?? "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30 shrink-0">
                      Deactivated
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs h-7 gap-1.5"
                      disabled={patchingId === u.userId}
                      onClick={() => patch(u.userId, { isActive: true })}
                    >
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
