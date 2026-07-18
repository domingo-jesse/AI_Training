import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Plus, Pencil, Trash2, BookOpen, RefreshCw, AlertCircle, Clock } from "lucide-react";

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

export default function ModulesPage() {
  const { currentOrg } = useOrganization();
  const { modules, isLoading, error, reload, deleteModule } = useModules(currentOrg?.organizationId);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (moduleId: number, title: string) => {
    if (!confirm(`Delete "${title}"? This will also remove all questions.`)) return;
    setDeleting(moduleId);
    await deleteModule(moduleId);
    setDeleting(null);
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Module Library</h1>
          <p className="text-muted-foreground mt-1">
            {modules.length} module{modules.length !== 1 ? "s" : ""} in {currentOrg?.organizationName ?? "…"}
          </p>
        </div>
        <Link href="/admin/module-builder">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Module
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={reload} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </CardContent>
        </Card>
      )}

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

      {!isLoading && modules.length > 0 && (
        <div className="grid gap-4">
          {modules.map(mod => (
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
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{mod.category}</span>
                    {mod.estimatedTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{mod.estimatedTime}
                      </span>
                    )}
                    {mod.llmScoringEnabled && (
                      <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/30">
                        AI scoring
                      </Badge>
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
