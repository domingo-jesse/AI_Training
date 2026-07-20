import { useEffect, useState, useCallback, useRef } from "react";
import { useSearch, useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
import { OwnerLayout } from "./OwnerLayout";
import { RefreshCw, AlertCircle, Info, AlertTriangle, Filter, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  log_id: number;
  level: string;
  category: string;
  message: string;
  metadata: any;
  org_id: number | null;
  org_name: string | null;
  user_id: string | null;
  created_at: string;
}

interface OrgOption { organization_id: number; name: string }

const LEVELS = ["all", "info", "warn", "error"];
const CATEGORIES = ["all", "general", "org_management", "auth", "api_error", "grading"];

const LEVEL_STYLE: Record<string, string> = {
  info:  "text-blue-400  bg-blue-600/10  border-blue-600/20",
  warn:  "text-amber-400 bg-amber-600/10 border-amber-600/20",
  error: "text-red-400   bg-red-600/10   border-red-600/20",
};

const LEVEL_ICON: Record<string, React.ElementType> = {
  info:  Info,
  warn:  AlertTriangle,
  error: AlertCircle,
};

function LogRow({ log }: { log: LogEntry }) {
  const [open, setOpen] = useState(false);
  const Icon = LEVEL_ICON[log.level] ?? Info;
  const style = LEVEL_STYLE[log.level] ?? LEVEL_STYLE.info;
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <div className={cn("border rounded-lg mb-2 overflow-hidden", style)}>
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => hasMetadata && setOpen(o => !o)}
      >
        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide">{log.level}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{log.category}</span>
            {log.org_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" />
                {log.org_name ?? `Org #${log.org_id}`}
              </span>
            )}
            <span className="text-[10px] text-gray-500 ml-auto">
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-white mt-0.5">{log.message}</p>
        </div>
        {hasMetadata && (
          <button className="text-gray-500 hover:text-white shrink-0">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {open && hasMetadata && (
        <div className="px-4 pb-3 border-t border-white/8">
          <pre className="text-[10px] text-gray-300 overflow-x-auto pt-2 leading-relaxed">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function OwnerLogsPage() {
  const search = useSearch();
  const [, navigate] = useLocation();

  // Parse initial orgId from URL (?orgId=3)
  const searchParams = new URLSearchParams(search);
  const initialOrgId = searchParams.get("orgId") ?? "all";

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [orgFilter, setOrgFilter] = useState(initialOrgId);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load available orgs for the filter dropdown
  useEffect(() => {
    fetch(`${basePath}/api/owner/orgs?limit=500`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setOrgs(Array.isArray(data) ? data.map((o: any) => ({ organization_id: Number(o.organization_id), name: o.name })) : []));
  }, []);

  // Sync orgFilter → URL so the link from OwnerOrgsPage works and is bookmarkable
  const handleOrgChange = (val: string) => {
    setOrgFilter(val);
    const p = new URLSearchParams(search);
    if (val === "all") p.delete("orgId"); else p.set("orgId", val);
    const qs = p.toString();
    navigate(`${basePath}/owner/logs${qs ? "?" + qs : ""}`, { replace: true });
  };

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (level !== "all")     params.set("level", level);
    if (category !== "all") params.set("category", category);
    if (orgFilter !== "all") params.set("orgId", orgFilter);
    params.set("limit", "200");

    fetch(`${basePath}/api/owner/logs?${params}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.resolve([]))
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [level, category, orgFilter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Visibility-aware auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    function startInterval() {
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === "visible") load();
      }, 10_000);
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") load();
    }
    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [autoRefresh, load]);

  const selectedOrg = orgs.find(o => String(o.organization_id) === orgFilter);

  return (
    <OwnerLayout>
      <div className="px-8 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity & Logs</h1>
            <p className="text-sm text-gray-400 mt-1">
              {selectedOrg ? (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {selectedOrg.name}
                  <span className="text-gray-600">·</span>
                  {logs.length} entries
                </span>
              ) : (
                <>{logs.length} entries — all organizations</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="accent-violet-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => { setLoading(true); load(); }}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Organization filter */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-400">Org:</span>
            <select
              value={orgFilter}
              onChange={e => handleOrgChange(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 max-w-[180px]"
            >
              <option value="all">All organizations</option>
              {orgs.map(o => (
                <option key={o.organization_id} value={String(o.organization_id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-400">Level:</span>
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs border transition-colors capitalize",
                  level === l
                    ? l === "error" ? "bg-red-600/20 text-red-400 border-red-600/30"
                      : l === "warn" ? "bg-amber-600/20 text-amber-400 border-amber-600/30"
                      : l === "info" ? "bg-blue-600/20 text-blue-400 border-blue-600/30"
                      : "bg-violet-600/20 text-violet-400 border-violet-600/30"
                    : "text-gray-500 border-white/8 hover:text-gray-300 hover:border-white/20"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Category:</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Clear org filter */}
          {orgFilter !== "all" && (
            <button
              onClick={() => handleOrgChange("all")}
              className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
            >
              Clear org filter
            </button>
          )}
        </div>

        {/* Log list */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Info className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No log entries match the current filters</p>
            <p className="text-gray-600 text-xs mt-1">Events will appear here as the platform is used</p>
          </div>
        ) : (
          <div>
            {logs.map(log => <LogRow key={log.log_id} log={log} />)}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
