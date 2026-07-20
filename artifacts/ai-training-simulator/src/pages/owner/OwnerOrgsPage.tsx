import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useImpersonation } from "@/contexts/ImpersonationContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
import { OwnerLayout } from "./OwnerLayout";
import {
  Building2, Plus, Users, BookOpen, ClipboardCheck, Trash2, Pencil,
  X, Check, ChevronRight, RefreshCw, Eye, GraduationCap, ShieldCheck,
  AlertCircle, ScrollText, Upload, FileText, CheckCircle2,
} from "lucide-react";

/* ── CSV helpers (shared with AccountsPage) ─────────────────── */
const VALID_ROLES_OWNER = ["learner", "manager", "admin", "owner"] as const;
type OrgRole = typeof VALID_ROLES_OWNER[number];

function parseOrgCSV(text: string): { name: string; email: string; role: OrgRole }[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const firstLower = lines[0].toLowerCase();
  const hasHeader = firstLower.includes("name") || firstLower.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const email = (cols[1] ?? cols[0] ?? "").toLowerCase().trim();
    const name  = cols[1] ? (cols[0] ?? "").trim() : "";
    const roleRaw = (cols[2] ?? "").toLowerCase().trim() as OrgRole;
    const role  = VALID_ROLES_OWNER.includes(roleRaw) ? roleRaw : "learner";
    return { name: name || email.split("@")[0], email, role };
  }).filter(r => r.email.includes("@"));
}

interface BulkImportRow { name: string; email: string; role: OrgRole }
interface BulkImportResult { email: string; name: string; status: "created" | "existing" | "error"; error?: string }

interface Org {
  organization_id: number;
  name: string;
  member_count: number;
  module_count: number;
  attempt_count: number;
  assignment_count: number;
  error_count: number;
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
      const r = await fetch(`${basePath}/api/owner/orgs`, {
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
            <p className="text-[10px] text-gray-600 mt-1">If this user already exists, they'll be added as org owner.</p>
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

function OrgDetailPanel({ orgId, orgName, onClose }: { orgId: number; orgName: string; onClose: () => void }) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const { startImpersonation } = useImpersonation();
  const [, navigate] = useLocation();

  // ── Bulk import state ──────────────────────────────────────────
  const [showBulk,    setShowBulk]    = useState(false);
  const [bulkRows,    setBulkRows]    = useState<BulkImportRow[]>([]);
  const [bulkFile,    setBulkFile]    = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkImportResult[] | null>(null);
  const [bulkError,   setBulkError]   = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkFile = (file: File) => {
    setBulkFile(file.name);
    setBulkResults(null);
    setBulkError("");
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseOrgCSV(ev.target?.result as string ?? "");
      if (rows.length === 0) { setBulkError("No valid rows found. Expected columns: name, email, role"); return; }
      setBulkRows(rows);
    };
    reader.readAsText(file);
  };

  const submitBulk = async () => {
    if (bulkRows.length === 0) return;
    setBulkLoading(true);
    setBulkError("");
    try {
      const r = await fetch(`${basePath}/api/owner/users/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, users: bulkRows }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Import failed");
      setBulkResults(data.results);
      // Refresh detail to show new members
      fetch(`${basePath}/api/owner/orgs/${orgId}`, { credentials: "include" })
        .then(resp => resp.ok ? resp.json() : null).then(d => d && setDetail(d));
    } catch (e: any) {
      setBulkError(e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const resetBulk = () => { setBulkRows([]); setBulkFile(""); setBulkResults(null); setBulkError(""); };

  useEffect(() => {
    fetch(`${basePath}/api/owner/orgs/${orgId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(d => d && setDetail(d));
  }, [orgId]);

  const name = detail?.org.name ?? orgName;

  const viewLogs = () => {
    onClose();
    navigate(`${basePath}/owner/logs?orgId=${orgId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <h2 className="text-lg font-semibold text-white">{name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Organization ID: {orgId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Actions */}
        {detail && (
          <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3 flex-wrap">
            <Eye className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400 font-medium">Preview as:</span>
            <button
              onClick={() => { onClose(); startImpersonation(orgId, name, "admin"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 text-xs font-medium transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              onClick={() => { onClose(); startImpersonation(orgId, name, "learner"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-300 text-xs font-medium transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Learner
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => { setShowBulk(v => !v); resetBulk(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showBulk ? "bg-violet-600/30 border-violet-500/40 text-violet-300" : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300"}`}
              >
                <Upload className="w-3.5 h-3.5" />
                Import Users
              </button>
              <button
                onClick={viewLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium transition-colors"
              >
                <ScrollText className="w-3.5 h-3.5" />
                View Logs
              </button>
            </div>
          </div>
        )}

        {!detail ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* ── Bulk Import Section ── */}
            {showBulk && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Bulk Import Users
                  </h3>
                  <button onClick={() => { setShowBulk(false); resetBulk(); }} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {bulkResults ? (
                  /* Results */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Created",  val: bulkResults.filter(r => r.status === "created").length,  cls: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
                        { label: "Existing", val: bulkResults.filter(r => r.status === "existing").length, cls: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
                        { label: "Errors",   val: bulkResults.filter(r => r.status === "error").length,    cls: "text-red-400 border-red-500/20 bg-red-500/10" },
                      ].map(s => (
                        <div key={s.label} className={`rounded-lg border py-2 ${s.cls}`}>
                          <p className="text-xl font-bold">{s.val}</p>
                          <p className="text-[10px] mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {bulkResults.map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${r.status === "created" ? "bg-emerald-500/8 text-emerald-300" : r.status === "existing" ? "bg-blue-500/8 text-blue-300" : "bg-red-500/8 text-red-300"}`}>
                          {r.status === "error"
                            ? <AlertCircle className="w-3 h-3 shrink-0" />
                            : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                          <span className="flex-1 truncate">{r.name ? `${r.name} · ` : ""}{r.email}</span>
                          <span className="opacity-60 capitalize">{r.status === "existing" ? "already in org" : r.status}{r.error ? `: ${r.error}` : ""}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={resetBulk} className="text-xs text-violet-400 hover:text-violet-300">
                      Import another file →
                    </button>
                  </div>
                ) : bulkRows.length === 0 ? (
                  /* Drop zone */
                  <div>
                    <div
                      className="border border-dashed border-white/15 rounded-lg p-6 text-center cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBulkFile(f); }}
                      onDragOver={e => e.preventDefault()}
                    >
                      <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-300">Drop a CSV or click to browse</p>
                      <p className="text-[10px] text-gray-600 mt-1">Columns: <code className="bg-white/5 px-1 rounded">name, email, role</code> · Max 500 rows</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFile(f); }} />
                    {bulkError && <p className="mt-2 text-xs text-red-400">{bulkError}</p>}
                  </div>
                ) : (
                  /* Preview */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <FileText className="w-3.5 h-3.5 text-violet-400" />
                      <span className="truncate max-w-[160px]">{bulkFile}</span>
                      <span>·</span><span>{bulkRows.length} user{bulkRows.length !== 1 ? "s" : ""}</span>
                      <button onClick={resetBulk} className="ml-auto text-gray-600 hover:text-red-400 transition-colors">Clear</button>
                    </div>
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-white/8 divide-y divide-white/5">
                      {bulkRows.slice(0, 50).map((row, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/3">
                          <span className="flex-1 text-white truncate">{row.name}</span>
                          <span className="text-gray-500 truncate max-w-[140px]">{row.email}</span>
                          <select value={row.role}
                            onChange={e => setBulkRows(prev => prev.map((r, idx) => idx === i ? { ...r, role: e.target.value as OrgRole } : r))}
                            className="h-5 rounded border border-white/10 bg-white/5 px-1 text-[10px] text-gray-300 focus:outline-none">
                            {VALID_ROLES_OWNER.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => setBulkRows(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {bulkRows.length > 50 && <div className="px-3 py-2 text-[10px] text-gray-500 text-center">+ {bulkRows.length - 50} more rows</div>}
                    </div>
                    {bulkError && <p className="text-xs text-red-400">{bulkError}</p>}
                    <div className="flex gap-2">
                      <button onClick={submitBulk} disabled={bulkLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-colors">
                        {bulkLoading ? <><RefreshCw className="w-3 h-3 animate-spin" /> Importing…</> : <><Upload className="w-3 h-3" /> Import {bulkRows.length} user{bulkRows.length !== 1 ? "s" : ""}</>}
                      </button>
                      <button onClick={resetBulk} className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">Clear</button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
  const [detailOrg, setDetailOrg] = useState<{ id: number; name: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const load = () => {
    setLoading(true);
    fetch(`${basePath}/api/owner/orgs`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.resolve([]))
      .then(data => setOrgs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveEdit = async (orgId: number) => {
    if (!editName.trim()) return;
    await fetch(`${basePath}/api/owner/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    load();
  };

  const deleteOrg = async (orgId: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`${basePath}/api/owner/orgs/${orgId}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const totalErrors = orgs.reduce((s, o) => s + (Number(o.error_count) || 0), 0);

  return (
    <OwnerLayout>
      <div className="px-8 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Organizations</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
              {orgs.length} organization{orgs.length !== 1 ? "s" : ""} on the platform
              {totalErrors > 0 && (
                <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {totalErrors} error{totalErrors !== 1 ? "s" : ""} (7d)
                </span>
              )}
            </p>
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
                  <th className="text-center px-4 py-3.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Errors (7d)</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, i) => {
                  const errCount = Number(org.error_count) || 0;
                  return (
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
                      <td className="px-4 py-4 text-center">
                        {errCount > 0 ? (
                          <button
                            onClick={() => navigate(`${basePath}/owner/logs?orgId=${org.organization_id}&level=error`)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/15 border border-red-600/25 text-red-400 text-xs font-medium hover:bg-red-600/25 transition-colors"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {errCount}
                          </button>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`${basePath}/owner/logs?orgId=${org.organization_id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 transition-colors"
                            title="View logs"
                          >
                            <ScrollText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingId(org.organization_id); setEditName(org.name); }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 transition-colors"
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDetailOrg({ id: org.organization_id, name: org.name })}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-600/10 transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteOrg(org.organization_id, org.name)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500 text-sm">
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
      {detailOrg !== null && (
        <OrgDetailPanel
          orgId={detailOrg.id}
          orgName={detailOrg.name}
          onClose={() => setDetailOrg(null)}
        />
      )}
    </OwnerLayout>
  );
}
