import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, UserPlus, RefreshCw, AlertCircle, Trash2, X, CheckCircle2,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface OrgMember {
  membershipId: string;
  userId: number;
  name: string;
  email: string | null;
  role: "owner" | "admin" | "manager" | "learner";
  status: "active" | "inactive" | "invited";
  joinedAt: string;
  isActive: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  owner:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  manager: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  learner: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-red-500/20 text-red-400 border-red-500/30",
  invited:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const ROLES = ["learner", "manager", "admin", "owner"] as const;

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function useOrgMembers(orgId: number | undefined) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrgId, setLastOrgId] = useState<number | undefined>();

  const load = (id: number) => {
    setIsLoading(true);
    setError(null);
    fetch(`${base}/api/organizations/${id}/members`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Failed (${r.status})`); return r.json(); })
      .then(data => { setMembers(data); setLastOrgId(id); })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  };

  if (orgId !== undefined && orgId !== lastOrgId && !isLoading) load(orgId);

  return { members, setMembers, isLoading, error, reload: () => orgId && load(orgId) };
}

export default function AccountsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const { members, setMembers, isLoading, error, reload } = useOrgMembers(currentOrg?.organizationId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<typeof ROLES[number]>("learner");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const orgId = currentOrg?.organizationId;

  const handleAdd = async () => {
    if (!addEmail.trim() || !orgId) return;
    setAddLoading(true);
    setAddMsg(null);
    try {
      const r = await fetch(`${base}/api/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Failed to add member");
      setMembers(prev => [...prev, body]);
      setAddMsg({ type: "ok", text: `${body.name} added as ${addRole}.` });
      setAddEmail("");
      setAddRole("learner");
    } catch (e: any) {
      setAddMsg({ type: "err", text: e.message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!orgId) return;
    setUpdatingId(userId);
    try {
      const r = await fetch(`${base}/api/organizations/${orgId}/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (!r.ok) throw new Error("Failed to update role");
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole as OrgMember["role"] } : m));
    } catch {
      // silent — UI will revert on next reload
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (userId: number, name: string) => {
    if (!orgId || !confirm(`Remove ${name} from this organization?`)) return;
    setRemovingId(userId);
    try {
      const r = await fetch(`${base}/api/organizations/${orgId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const b = await r.json();
        alert(b.error ?? "Failed to remove");
        return;
      }
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } finally {
      setRemovingId(null);
    }
  };

  // Split active vs inactive
  const active = members.filter(m => m.status === "active");
  const inactive = members.filter(m => m.status === "inactive");

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
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">Account Management</h1>
        </div>
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
            {currentOrg.organizationName} · {active.length} active member{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowAddForm(v => !v); setAddMsg(null); }}>
            {showAddForm ? <X className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {showAddForm ? "Cancel" : "Add Member"}
          </Button>
        </div>
      </div>

      {/* Add member form */}
      {showAddForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="py-4 px-5 border-b border-border/50">
            <CardTitle className="text-base">Add Member to {currentOrg.organizationName}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              The user must have signed in to the app at least once before you can add them.
            </p>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-48 space-y-1.5">
                <Label className="text-sm">Email address *</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
              </div>
              <div className="w-40 space-y-1.5">
                <Label className="text-sm">Role</Label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as typeof ROLES[number])}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              <Button onClick={handleAdd} disabled={addLoading || !addEmail.trim()}>
                {addLoading
                  ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  : <UserPlus className="w-4 h-4 mr-2" />}
                Add Member
              </Button>
            </div>

            {addMsg && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${addMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {addMsg.type === "ok"
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {addMsg.text}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          {/* Active members */}
          {active.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed mb-4">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Active Members</h2>
              <p className="text-muted-foreground mb-4">Add someone to get started.</p>
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Add Member
              </Button>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader className="border-b border-border pb-4 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Active Members <span className="text-muted-foreground font-normal">({active.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {active.map(member => (
                    <div key={member.membershipId} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                        {getInitials(member.name)}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email ?? "—"}</p>
                      </div>

                      {/* Role selector */}
                      <div className="shrink-0">
                        {updatingId === member.userId ? (
                          <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                        ) : (
                          <select
                            value={member.role}
                            onChange={e => handleRoleChange(member.userId, e.target.value)}
                            className={`h-7 rounded border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring capitalize cursor-pointer ${ROLE_COLORS[member.role] ?? ""}`}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r} className="bg-background text-foreground capitalize">{r}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge variant="outline" className={`text-xs capitalize shrink-0 ${STATUS_COLORS[member.status] ?? ""}`}>
                        {member.status}
                      </Badge>

                      {/* Joined date */}
                      <p className="text-xs text-muted-foreground w-24 text-right shrink-0">
                        {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>

                      {/* Remove button — shows on hover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleRemove(member.userId, member.name)}
                        disabled={removingId === member.userId}
                        title="Remove from organization"
                      >
                        {removingId === member.userId
                          ? <RefreshCw className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inactive members (collapsed) */}
          {inactive.length > 0 && (
            <Card className="border-dashed opacity-70">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Removed Members ({inactive.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {inactive.map(member => (
                    <div key={member.membershipId} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/10 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate line-through">{member.name}</p>
                        <p className="text-xs text-muted-foreground/60 truncate">{member.email ?? "—"}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize bg-red-500/10 text-red-400 border-red-500/30 shrink-0">
                        removed
                      </Badge>
                      {/* Re-add button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs h-7"
                        onClick={async () => {
                          if (!member.email || !orgId) return;
                          setAddLoading(true);
                          try {
                            const r = await fetch(`${base}/api/organizations/${orgId}/members`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ email: member.email, role: member.role }),
                            });
                            if (r.ok) reload();
                          } finally {
                            setAddLoading(false);
                          }
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}
