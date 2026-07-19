import { useEffect, useState } from "react";
import { OwnerLayout } from "./OwnerLayout";
import { Building2, Plus, Users, BookOpen, ClipboardCheck, Trash2, Pencil, X, Check, ChevronRight, RefreshCw } from "lucide-react";

interface Org {
  organization_id: number;
  name: string;
  member_count: number;
  module_count: number;
  attempt_count: number;
  assignment_count: number;
}

interface OrgDetail {
  org: { organization_id: number; name: string };
  members: any[];
  modules: any[];
}

function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Organization name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/ai-training-simulator/api/owner/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), adminEmail: adminEmail.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to create org"); return; }
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">New Organization</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Organization Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              onKeyDown={e => e.key === "Enter" && submit()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">
              First Admin Email <span className="text-gray-600">(optional)</span>
            </label>
            <input
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@company.com"
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            <p className="text-[10px] text-gray-600 mt-1">If this user already exists in the system, they'll be added as org owner.</p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Organization"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrgDetailPanel({ orgId, onClose }: { orgId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);

  useEffect(() => {
    fetch(`/ai-training-simulator/api/owner/orgs/${orgId}`, { credentials: "include" })
      .then(r => r.json()).then(setDetail);
  }, [orgId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <h2 className="text-lg font-semibold text-white">{detail?.org.name ?? "Loading…"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Organization ID: {orgId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {!detail ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
            {/* Members */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Members ({detail.members.length})</h3>
              <div className="space-y-2">
                {detail.members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/3">
                    <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center text-xs text-violet-300 font-semibold shrink-0">
                      {m.name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      m.role === "owner" ? "border-violet-500/30 text-violet-400 bg-violet-500/10" :
                      m.role === "admin" ? "border-blue-500/30 text-blue-400 bg-blue-500/10" :
                      "border-white/10 text-gray-400"
                    }`}>{m.role}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.status === "active" ? "text-emerald-400" : "text-gray-500"}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
                {!detail.members.length && <p className="text-xs text-gray-500 text-center py-3">No members yet</p>}
              </div>
            </div>

            {/* Modules */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Modules ({detail.modules.length})</h3>
              <div className="space-y-2">
                {detail.modules.slice(0, 10).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/3">
                    <BookOpen className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <p className="text-sm text-white flex-1 truncate">{m.title}</p>
                    <span className="text-[10px] text-gray-500">{m.difficulty}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.status === "active" ? "text-emerald-400" : "text-orange-400"}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
                {!detail.modules.length && <p className="text-xs text-gray-500 text-center py-3">No modules yet</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OwnerOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailOrgId, setDetailOrgId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/ai-training-simulator/api/owner/orgs", { credentials: "include" })
      .then(r => r.json())
      .then(setOrgs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveEdit = async (orgId: number) => {
    if (!editName.trim()) return;
    await fetch(`/ai-training-simulator/api/owner/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    load();
  };

  const deleteOrg = async (orgId: number) => {
    if (!window.confirm("Delete this organization? This cannot be undone.")) return;
    await fetch(`/ai-training-simulator/api/owner/orgs/${orgId}`, {
      method: "DELETE", credentials: "include",
    });
    setDeletingId(null);
    load();
  };

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <OwnerLayout>
      <div className="px-8 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Organizations</h1>
            <p className="text-sm text-gray-400 mt-1">{orgs.length} organization{orgs.length !== 1 ? "s" : ""} on the platform</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Organization
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-3.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Organization</th>
                  <th className="text-center px-4 py-3.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Members</th>
                  <th className="text-center px-4 py-3.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Modules</th>
                  <th className="text-center px-4 py-3.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Attempts</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, i) => (
                  <tr key={org.organization_id} className={`border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-5 py-4">
                      {editingId === org.organization_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="bg-white/10 border border-violet-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                            autoFocus
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(org.organization_id); if (e.key === "Escape") setEditingId(null); }}
                          />
                          <button onClick={() => saveEdit(org.organization_id)} className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{org.name}</p>
                            <p className="text-[10px] text-gray-500">ID: {org.organization_id}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white font-medium">{org.member_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white font-medium">{org.module_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white font-medium">{org.attempt_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingId(org.organization_id); setEditName(org.name); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDetailOrgId(org.organization_id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-600/10 transition-colors"
                          title="View details"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteOrg(org.organization_id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500 text-sm">
                      {search ? "No organizations match your search" : "No organizations yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {detailOrgId !== null && <OrgDetailPanel orgId={detailOrgId} onClose={() => setDetailOrgId(null)} />}
    </OwnerLayout>
  );
}
