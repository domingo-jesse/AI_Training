import { useState, useEffect } from "react";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, Check, RefreshCw, CheckCircle2, Mail, BookOpen, Award,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function flash(set: (s: SaveState) => void, result: "saved" | "error") {
  set(result);
  setTimeout(() => set("idle"), result === "saved" ? 2500 : 4000);
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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

// ── Section card ──────────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, description, children, onSave, saveState,
}: {
  icon: any; title: string; description: string; children: React.ReactNode;
  onSave?: () => void; saveState?: SaveState;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {children}
        {onSave && (
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/40">
            <Button size="sm" onClick={onSave} disabled={saveState === "saving"} className="min-w-20">
              {saveState === "saving"
                ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Saving…</>
                : <><Check className="w-3 h-3 mr-1.5" />Save changes</>}
            </Button>
            {saveState === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════════

export default function LearnerSettingsPage() {
  const { localUser, isLoading } = useCurrentUser();

  // ── Notification prefs (backed by DB) ──────────────────────────────────────
  const [emailNotifs,      setEmailNotifs]      = useState(true);
  const [assignmentEmails, setAssignmentEmails] = useState(true);
  const [gradingEmails,    setGradingEmails]    = useState(true);
  const [notifSave,        setNotifSave]        = useState<SaveState>("idle");

  // Populate from loaded user
  useEffect(() => {
    if (!localUser) return;
    const enabled = localUser.emailNotificationsEnabled ?? true;
    setEmailNotifs(enabled);
    // Assignment + grading emails mirror the master toggle until individual prefs are added to DB
    setAssignmentEmails(enabled);
    setGradingEmails(enabled);
  }, [localUser]);

  const saveNotifs = async () => {
    setNotifSave("saving");
    try {
      const r = await fetch(`${base}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailNotificationsEnabled: emailNotifs }),
      });
      flash(setNotifSave, r.ok ? "saved" : "error");
    } catch {
      flash(setNotifSave, "error");
    }
  };

  if (isLoading) {
    return (
      <LearnerLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </LearnerLayout>
    );
  }

  return (
    <LearnerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your notification and learning preferences.</p>
      </div>

      <div className="max-w-xl space-y-4">

        {/* ── Notifications ── */}
        <Section
          icon={Bell}
          title="Notifications"
          description="Choose which emails you receive from us."
          onSave={saveNotifs}
          saveState={notifSave}
        >
          <div className="mt-3 space-y-3">
            <ToggleRow
              label="Email notifications"
              description="Master switch — turns all email alerts on or off."
              checked={emailNotifs}
              onChange={v => { setEmailNotifs(v); if (!v) { setAssignmentEmails(false); setGradingEmails(false); } }}
            />

            {/* Sub-toggles — greyed out when master is off */}
            <div className={`space-y-2 pl-4 border-l-2 border-border/40 transition-opacity ${emailNotifs ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <ToggleRow
                label="New assignment alerts"
                description="Get notified when an admin assigns a module to you."
                checked={assignmentEmails}
                onChange={setAssignmentEmails}
              />
              <ToggleRow
                label="Grading results"
                description="Get notified when your submission has been graded."
                checked={gradingEmails}
                onChange={setGradingEmails}
              />
            </div>
          </div>
        </Section>

        {/* ── Learning preferences (UI prefs — informational) ── */}
        <Section
          icon={BookOpen}
          title="Learning preferences"
          description="How modules behave during your sessions."
        >
          <div className="mt-3 divide-y divide-border/40">
            {[
              {
                label: "Passing score",
                value: "Set by your organization",
                note: "Contact your admin to adjust the passing threshold.",
              },
              {
                label: "Multiple attempts",
                value: "Set by your organization",
                note: "Whether you can retake a module is controlled by your admin.",
              },
              {
                label: "Score visibility",
                value: "Set by your organization",
                note: "Your admin controls whether scores are shown immediately after submission.",
              },
            ].map(row => (
              <div key={row.label} className="py-3 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  <span className="text-xs text-muted-foreground">{row.value}</span>
                </div>
                <p className="text-xs text-muted-foreground/70">{row.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Achievements info ── */}
        <Section
          icon={Award}
          title="Progress & achievements"
          description="How your results are tracked."
        >
          <div className="mt-3 divide-y divide-border/40">
            {[
              {
                label: "Progress tracking",
                value: "Always on",
                note: "Your completion percentage and scores are always recorded.",
              },
              {
                label: "Admin visibility",
                value: "Always visible",
                note: "Admins can view your progress, scores, and attempt history.",
              },
              {
                label: "Data export",
                value: "Contact your admin",
                note: "Ask your admin if you need a copy of your training records.",
              },
            ].map(row => (
              <div key={row.label} className="py-3 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  <span className="text-xs text-muted-foreground">{row.value}</span>
                </div>
                <p className="text-xs text-muted-foreground/70">{row.note}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </LearnerLayout>
  );
}
