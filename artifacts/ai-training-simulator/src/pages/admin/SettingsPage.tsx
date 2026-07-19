import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Settings, RefreshCw, AlertCircle, CheckCircle2,
  GraduationCap, BookOpen, Eye, ShieldAlert, Building2,
  Check,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────

interface OrgSettings {
  orgName: string;
  passingScore: number;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  defaultDifficulty: string;
  defaultTimeLimit: number;
  showScoreToLearner: boolean;
  showFeedbackToLearner: boolean;
}

// ── Toggle switch ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Setting row ────────────────────────────────────────────────────────────

function SettingRow({
  label, description, children,
}: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  onSave,
  saveState,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveState?: SaveState;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
        {onSave && (
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/40">
            <Button size="sm" onClick={onSave} disabled={saveState === "saving"} className="min-w-20">
              {saveState === "saving" ? (
                <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Saving…</>
              ) : (
                <><Check className="w-3 h-3 mr-1.5" />Save</>
              )}
            </Button>
            {saveState === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" /> Failed to save
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrg?.organizationId;

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState<string | null>(null);

  // Per-section draft state
  const [grading,  setGrading]  = useState({ passingScore: 70, allowMultipleAttempts: true, maxAttempts: 3 });
  const [modDef,   setModDef]   = useState({ defaultDifficulty: "intermediate", defaultTimeLimit: 0 });
  const [learner,  setLearner]  = useState({ showScoreToLearner: true, showFeedbackToLearner: true });

  // Per-section save state
  const [gradingSave,  setGradingSave]  = useState<SaveState>("idle");
  const [modDefSave,   setModDefSave]   = useState<SaveState>("idle");
  const [learnerSave,  setLearnerSave]  = useState<SaveState>("idle");

  // ── Load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setLoadErr(null);
    fetch(`${base}/api/settings?orgId=${orgId}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((s: OrgSettings) => {
        setSettings(s);
        setGrading({ passingScore: s.passingScore, allowMultipleAttempts: s.allowMultipleAttempts, maxAttempts: s.maxAttempts });
        setModDef({ defaultDifficulty: s.defaultDifficulty, defaultTimeLimit: s.defaultTimeLimit });
        setLearner({ showScoreToLearner: s.showScoreToLearner, showFeedbackToLearner: s.showFeedbackToLearner });
      })
      .catch(e => setLoadErr(e.message))
      .finally(() => setLoading(false));
  }, [orgId]);

  // ── Save helper ───────────────────────────────────────────────────────

  const save = useCallback(async (
    fields: Partial<OrgSettings>,
    setSaveState: (s: SaveState) => void
  ) => {
    if (!orgId) return;
    setSaveState("saving");
    try {
      const r = await fetch(`${base}/api/settings?orgId=${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
      });
      if (!r.ok) throw new Error(await r.text());
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [orgId]);

  // ── Render states ─────────────────────────────────────────────────────

  if (orgLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (loadErr) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 max-w-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {loadErr}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Configure {currentOrg?.organizationName ?? "your organization"}'s training defaults and preferences.
        </p>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* ── Organization ── */}
        <SectionCard
          icon={Building2}
          title="Organization"
          description="Basic information about your workspace."
        >
          <div className="pt-2 space-y-3">
            <SettingRow label="Organization name" description="Managed through your authentication provider.">
              <span className="text-sm text-muted-foreground font-medium">{settings?.orgName ?? currentOrg?.organizationName}</span>
            </SettingRow>
            <SettingRow label="Organization ID" description="Your internal workspace identifier.">
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{orgId}</span>
            </SettingRow>
          </div>
        </SectionCard>

        {/* ── Grading & Assessment ── */}
        <SectionCard
          icon={GraduationCap}
          title="Grading & Assessment"
          description="Set default rules for how learner submissions are scored and retaken."
          onSave={() => save(grading, setGradingSave)}
          saveState={gradingSave}
        >
          <div className="pt-2">
            <SettingRow
              label="Passing score"
              description="Minimum percentage required to pass a module."
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={grading.passingScore}
                  onChange={e => setGrading(d => ({ ...d, passingScore: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="h-8 w-20 text-sm text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </SettingRow>

            <SettingRow
              label="Allow multiple attempts"
              description="Let learners retake a module after submitting."
            >
              <Toggle
                checked={grading.allowMultipleAttempts}
                onChange={v => setGrading(d => ({ ...d, allowMultipleAttempts: v }))}
              />
            </SettingRow>

            {grading.allowMultipleAttempts && (
              <SettingRow
                label="Maximum attempts"
                description="How many times a learner can attempt each module. Set to 0 for unlimited."
              >
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={grading.maxAttempts}
                  onChange={e => setGrading(d => ({ ...d, maxAttempts: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-8 w-20 text-sm text-right"
                />
              </SettingRow>
            )}
          </div>
        </SectionCard>

        {/* ── Module Defaults ── */}
        <SectionCard
          icon={BookOpen}
          title="Module Defaults"
          description="Pre-fill values when creating new modules."
          onSave={() => save(modDef, setModDefSave)}
          saveState={modDefSave}
        >
          <div className="pt-2">
            <SettingRow
              label="Default difficulty"
              description="Starting difficulty level for newly created modules."
            >
              <select
                value={modDef.defaultDifficulty}
                onChange={e => setModDef(d => ({ ...d, defaultDifficulty: e.target.value }))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </SettingRow>

            <SettingRow
              label="Default time limit"
              description="Suggested time cap for new modules in minutes. 0 = no limit."
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={modDef.defaultTimeLimit}
                  onChange={e => setModDef(d => ({ ...d, defaultTimeLimit: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-8 w-20 text-sm text-right"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </SettingRow>
          </div>
        </SectionCard>

        {/* ── Learner Experience ── */}
        <SectionCard
          icon={Eye}
          title="Learner Experience"
          description="Control what learners see after their submissions are graded."
          onSave={() => save(learner, setLearnerSave)}
          saveState={learnerSave}
        >
          <div className="pt-2">
            <SettingRow
              label="Show score after grading"
              description="Learners can see their numeric score once an admin grades their attempt."
            >
              <Toggle
                checked={learner.showScoreToLearner}
                onChange={v => setLearner(d => ({ ...d, showScoreToLearner: v }))}
              />
            </SettingRow>

            <SettingRow
              label="Show feedback after grading"
              description="Learners can read the admin's written feedback on their responses."
            >
              <Toggle
                checked={learner.showFeedbackToLearner}
                onChange={v => setLearner(d => ({ ...d, showFeedbackToLearner: v }))}
              />
            </SettingRow>
          </div>
        </SectionCard>

        {/* ── Danger Zone ── */}
        <SectionCard
          icon={ShieldAlert}
          title="Danger Zone"
          description="Irreversible actions — proceed carefully."
        >
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between gap-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Export all data</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download a full export of all modules, assignments, and attempt data for this organization.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => alert("Data export is coming soon. Contact support for urgent exports.")}
              >
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between gap-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Clear all attempt data</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently delete all learner submissions and scores. Module content is not affected.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => alert("Please contact support to perform this action — it cannot be undone.")}
              >
                Clear
              </Button>
            </div>
          </div>
        </SectionCard>

      </div>
    </AdminLayout>
  );
}
