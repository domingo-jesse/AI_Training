import { useState, useMemo } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Plus, Pencil, Trash2, BookOpen, RefreshCw, AlertCircle, Clock,
  Search, X, Sparkles, ArrowUpDown,
} from "lucide-react";

interface ModuleSummary {
  moduleId: number;
  title: string;
  category: string;
  difficulty: string;
  description: string | null;
  estimatedTime: string | null;
  status: string;
  scoringStyle: string;
  llmScoringEnabled: boolean;
  createdAt: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  advanced:     "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  draft:     "bg-slate-500/20 text-slate-400 border-slate-500/30",
  archived:  "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

type SortKey = "newest" | "oldest" | "az" | "za";
const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest", oldest: "Oldest", az: "A–Z", za: "Z–A",
};

function useModules(orgId: number | undefined) {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOrgId, setLoadedOrgId] = useState<number | undefined>();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const load = (id: number) => {
    setIsLoading(true);
    setError(null);
    fetch(`${basePath}/api/modules?orgId=${id}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Failed to load (${r.status})`); return r.json(); })
      .then(data => { setModules(data); setLoadedOrgId(id); })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  };

  if (orgId !== undefined && orgId !== loadedOrgId && !isLoading) load(orgId);

  const deleteModule = async (moduleId: number) => {
    await fetch(`${basePath}/api/modules/${moduleId}`, { method: "DELETE", credentials: "include" });
    setModules(prev => prev.filter(m => m.moduleId !== moduleId));
  };

  return { modules, isLoading, error, reload: () => orgId && load(orgId), deleteModule };
}

// Compact chip button used for filter groups
function Chip({
  active, onClick, children, color,
}: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-3 rounded-full text-xs font-medium border transition-all ${
        active
          ? color ?? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function ModulesPage() {
  const { currentOrg } = useOrganization();
  const { modules, isLoading, error, reload, deleteModule } = useModules(currentOrg?.organizationId);
  const [deleting, setDeleting] = useState<number | null>(null);

  // ── Filters ──
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<string>("all");
  const [diffFilter, setDiff]       = useState<string>("all");
  const [aiOnly, setAiOnly]         = useState(false);
  const [sort, setSort]             = useState<SortKey>("newest");
  const [sortOpen, setSortOpen]     = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = modules.filter(m => {
      if (q && !m.title.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (diffFilter   !== "all" && m.difficulty !== diffFilter) return false;
      if (aiOnly && !m.llmScoringEnabled) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "az")     return a.title.localeCompare(b.title);
      if (sort === "za")     return b.title.localeCompare(a.title);
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
    });

    return list;
  }, [modules, search, statusFilter, diffFilter, aiOnly, sort]);

  const activeFilterCount = [
    search !== "",
    statusFilter !== "all",
    diffFilter !== "all",
    aiOnly,
  ].filter(Boolean).length;

  const clearAll = () => {
    setSearch(""); setStatus("all"); setDiff("all"); setAiOnly(false);
  };

  const handleDelete = async (moduleId: number, title: string) => {
    if (!confirm(`Delete "${title}"? This will also remove all questions.`)) return;
    setDeleting(moduleId);
    await deleteModule(moduleId);
    setDeleting(null);
  };

  return (
    <AdminLayout>
      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Module Library</h1>
          <p className="text-muted-foreground mt-1">
            {modules.length} module{modules.length !== 1 ? "s" : ""} in {currentOrg?.organizationName ?? "…"}
            {activeFilterCount > 0 && (
              <span className="ml-2 text-xs text-primary">
                · {filtered.length} shown
              </span>
            )}
          </p>
        </div>
        <Link href="/admin/module-builder">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Module
          </Button>
        </Link>
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-5 space-y-3">
        {/* Row 1: search + sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="h-8 w-full pl-8 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(v => !v)}
              className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {SORT_LABELS[sort]}
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-9 z-20 min-w-[130px] rounded-md border border-border bg-popover shadow-lg py-1">
                  {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSort(key); setSortOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${sort === key ? "text-primary font-medium" : "text-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md transition-colors">
              Clear {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Row 2: chip filters */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-12">Status</span>
            {["all", "published", "draft", "archived"].map(s => (
              <Chip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatus(s)}
                color={
                  s === "published" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                  s === "draft"     ? "bg-slate-500/20 text-slate-400 border-slate-500/40" :
                  s === "archived"  ? "bg-orange-500/20 text-orange-400 border-orange-500/40" :
                  undefined
                }
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Chip>
            ))}
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16">Difficulty</span>
            {["all", "beginner", "intermediate", "advanced"].map(d => (
              <Chip
                key={d}
                active={diffFilter === d}
                onClick={() => setDiff(d)}
                color={
                  d === "beginner"     ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                  d === "intermediate" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                  d === "advanced"     ? "bg-red-500/20 text-red-400 border-red-500/40" :
                  undefined
                }
              >
                {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
              </Chip>
            ))}
          </div>

          {/* AI Scoring toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-12">Scoring</span>
            <Chip
              active={aiOnly}
              onClick={() => setAiOnly(v => !v)}
              color="bg-violet-500/20 text-violet-400 border-violet-500/40"
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI only
              </span>
            </Chip>
          </div>
        </div>

      </div>

      {/* ── Error ── */}
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={reload} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </CardContent>
        </Card>
      )}

      {/* ── Empty: no modules at all ── */}
      {!isLoading && !error && modules.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No modules yet</h2>
          <p className="text-muted-foreground mb-6">Create your first training module to get started.</p>
          <Link href="/admin/module-builder">
            <Button><Plus className="w-4 h-4 mr-2" /> Create Module</Button>
          </Link>
        </Card>
      )}

      {/* ── Empty: filters match nothing ── */}
      {!isLoading && modules.length > 0 && filtered.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
          <Search className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="font-medium">No modules match your filters</p>
          <button onClick={clearAll} className="mt-2 text-sm text-primary underline underline-offset-2">
            Clear all filters
          </button>
        </Card>
      )}

      {/* ── Module list ── */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map(mod => (
            <Card key={mod.moduleId} className="hover:border-border/80 transition-colors">
              <CardContent className="flex items-center gap-4 py-4 px-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{mod.title}</p>
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[mod.status] ?? ""}`}>
                      {mod.status}
                    </Badge>
                    <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[mod.difficulty] ?? ""}`}>
                      {mod.difficulty}
                    </Badge>
                    {mod.llmScoringEnabled && (
                      <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> AI scoring
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{mod.category}</span>
                    {mod.estimatedTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{mod.estimatedTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/module-builder?id=${mod.moduleId}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => handleDelete(mod.moduleId, mod.title)}
                    disabled={deleting === mod.moduleId}
                  >
                    {deleting === mod.moduleId
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
