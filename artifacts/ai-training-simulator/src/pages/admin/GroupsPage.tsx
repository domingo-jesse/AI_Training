import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Users, Plus, Pencil, Trash2, X, Check, Search,
  ChevronLeft, UserPlus, UserMinus, AlertCircle, Layers,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────

interface GroupMember {
  userId: number;
  userName: string;
  userEmail: string | null;
}

interface Group {
  groupId: number;
  orgId: number;
  name: string;
  color: string;
  createdAt: string | null;
  memberCount: number;
  members: GroupMember[];
}

interface OrgMember {
  userId: number;
  name: string;
  email: string | null;
  role: string;
}

// ── Palette of preset colors ───────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#3b82f6", "#a855f7", "#64748b",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Color dot ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition-all ${
            value === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

// ── Group avatar ───────────────────────────────────────────────────────────

function GroupDot({ color, size = "md" }: { color: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "w-14 h-14 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${cls} rounded-xl flex items-center justify-center shrink-0`} style={{ backgroundColor: color + "33", border: `2px solid ${color}55` }}>
      <Layers className={size === "lg" ? "w-7 h-7" : "w-5 h-5"} style={{ color }} />
    </div>
  );
}

// ── Create / Edit modal ────────────────────────────────────────────────────

function GroupModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: { name: string; color: string };
  onSave: (name: string, color: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName]   = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold mb-4">{initial ? "Edit Group" : "Create Group"}</h3>

        <label className="block text-xs text-muted-foreground mb-1">Group name</label>
        <Input
          ref={ref}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Engineering, Support, Sales…"
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim(), color); }}
        />

        <label className="block text-xs text-muted-foreground mt-4 mb-1">Color</label>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full shrink-0 border-2 border-border" style={{ backgroundColor: color }} />
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || saving} onClick={() => onSave(name.trim(), color)}>
            {saving ? "Saving…" : initial ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────

function Confirm({ title, desc, onConfirm, onCancel }: { title: string; desc: string; onConfirm(): void; onCancel(): void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{desc}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════

export default function GroupsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [groups,    setGroups]    = useState<Group[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // UI state
  const [selected,      setSelected]      = useState<Group | null>(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [editGroup,     setEditGroup]     = useState<Group | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Group | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [memberSearch,  setMemberSearch]  = useState("");
  const [addSearch,     setAddSearch]     = useState("");
  const [groupSearch,   setGroupSearch]   = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────

  async function fetchAll() {
    if (!orgId) return;
    setLoading(true); setError(null);
    try {
      const [g, m] = await Promise.all([
        fetch(`${base}/api/groups?orgId=${orgId}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${base}/api/organizations/${orgId}/members`, { credentials: "include" }).then(r => r.json()),
      ]);
      setGroups(Array.isArray(g) ? g : []);
      setOrgMembers(Array.isArray(m) ? m.filter((u: OrgMember) => u.role === "learner") : []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [orgId]);

  // Keep selected group in sync after re-fetch
  useEffect(() => {
    if (selected) {
      const fresh = groups.find(g => g.groupId === selected.groupId);
      if (fresh) setSelected(fresh);
    }
  }, [groups]);

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleCreate(name: string, color: string) {
    setSaving(true);
    try {
      const r = await fetch(`${base}/api/groups`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name, color }),
      });
      if (!r.ok) throw new Error(await r.text());
      const created = await r.json();
      setGroups(g => [...g, created]);
      setShowCreate(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleEdit(name: string, color: string) {
    if (!editGroup) return;
    setSaving(true);
    try {
      const r = await fetch(`${base}/api/groups/${editGroup.groupId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!r.ok) throw new Error(await r.text());
      const updated = await r.json();
      setGroups(g => g.map(x => x.groupId === updated.groupId ? { ...x, ...updated } : x));
      setEditGroup(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(group: Group) {
    setSaving(true);
    try {
      await fetch(`${base}/api/groups/${group.groupId}`, { method: "DELETE", credentials: "include" });
      setGroups(g => g.filter(x => x.groupId !== group.groupId));
      setDeleteTarget(null);
      if (selected?.groupId === group.groupId) setSelected(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleAddMember(userId: number) {
    if (!selected) return;
    try {
      await fetch(`${base}/api/groups/${selected.groupId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      await fetchAll();
    } catch (e: any) { setError(e.message); }
  }

  async function handleRemoveMember(userId: number) {
    if (!selected) return;
    try {
      await fetch(`${base}/api/groups/${selected.groupId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchAll();
    } catch (e: any) { setError(e.message); }
  }

  // ── Loading / error ────────────────────────────────────────────────────

  if (orgLoading || (loading && groups.length === 0)) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // ── Drill-down: selected group ─────────────────────────────────────────

  if (selected) {
    const memberIds  = new Set(selected.members.map(m => m.userId));
    const notInGroup = orgMembers.filter(m => !memberIds.has(m.userId));
    const filteredMembers = selected.members.filter(m =>
      !memberSearch || m.userName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.userEmail ?? "").toLowerCase().includes(memberSearch.toLowerCase())
    );
    const filteredAdd = notInGroup.filter(m =>
      !addSearch || m.name.toLowerCase().includes(addSearch.toLowerCase()) ||
      (m.email ?? "").toLowerCase().includes(addSearch.toLowerCase())
    );

    return (
      <AdminLayout>
        {/* Back */}
        <button
          onClick={() => { setSelected(null); setMemberSearch(""); setAddSearch(""); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Groups
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <GroupDot color={selected.color} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{selected.name}</h1>
            <p className="text-sm text-muted-foreground">{selected.memberCount} member{selected.memberCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditGroup(selected)}>
              <Pencil className="w-4 h-4 mr-1.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setDeleteTarget(selected)}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Members</h2>
              <span className="text-xs text-muted-foreground">{selected.memberCount}</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members…" className="pl-9" />
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {filteredMembers.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  {selected.memberCount === 0 ? "No members yet — add some from the right." : "No results."}
                </div>
              )}
              {filteredMembers.map(m => (
                <div key={m.userId} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0" style={{ backgroundColor: selected.color + "33", color: selected.color }}>
                    {initials(m.userName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.userEmail ?? "—"}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    title="Remove from group"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Add Learners</h2>
              <span className="text-xs text-muted-foreground">{notInGroup.length} available</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search learners…" className="pl-9" />
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {filteredAdd.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  {notInGroup.length === 0 ? "All learners are in this group." : "No results."}
                </div>
              )}
              {filteredAdd.map(m => (
                <div key={m.userId} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
                  <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email ?? "—"}</p>
                  </div>
                  <button
                    onClick={() => handleAddMember(m.userId)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0"
                    title="Add to group"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        {editGroup && (
          <GroupModal
            initial={{ name: editGroup.name, color: editGroup.color }}
            onSave={handleEdit}
            onClose={() => setEditGroup(null)}
            saving={saving}
          />
        )}
        {deleteTarget && (
          <Confirm
            title={`Delete "${deleteTarget.name}"?`}
            desc={`This will remove the group and all its member assignments. The learners themselves won't be affected.`}
            onConfirm={() => handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AdminLayout>
    );
  }

  // ── Main list ──────────────────────────────────────────────────────────

  const filtered = groups.filter(g =>
    !groupSearch || g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">Organize learners into teams or departments for bulk assignment and filtering.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" /> New Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold">{groups.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total groups</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold">{orgMembers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total learners</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold">
            {new Set(groups.flatMap(g => g.members.map(m => m.userId))).size}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Learners in groups</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Search groups…" className="pl-9" />
      </div>

      {/* Group cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <Layers className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-base font-medium mb-1">No groups yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create groups to organize learners by team or department.</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> New Group</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(g => (
            <button
              key={g.groupId}
              onClick={() => setSelected(g)}
              className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <GroupDot color={g.color} />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditGroup(g); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(g); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">{g.name}</p>

              <div className="flex items-center gap-1.5 mt-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{g.memberCount} member{g.memberCount !== 1 ? "s" : ""}</span>
              </div>

              {/* Member avatar stack */}
              {g.members.length > 0 && (
                <div className="flex -space-x-2 mt-3">
                  {g.members.slice(0, 5).map(m => (
                    <div
                      key={m.userId}
                      className="w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: g.color + "33", color: g.color }}
                      title={m.userName}
                    >
                      {initials(m.userName)}
                    </div>
                  ))}
                  {g.members.length > 5 && (
                    <div className="w-7 h-7 rounded-full border-2 border-card bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                      +{g.members.length - 5}
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <GroupModal onSave={handleCreate} onClose={() => setShowCreate(false)} saving={saving} />
      )}

      {/* Edit modal */}
      {editGroup && !selected && (
        <GroupModal
          initial={{ name: editGroup.name, color: editGroup.color }}
          onSave={handleEdit}
          onClose={() => setEditGroup(null)}
          saving={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && !selected && (
        <Confirm
          title={`Delete "${deleteTarget.name}"?`}
          desc="This will remove the group and all its member assignments. Learners won't be affected."
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}
