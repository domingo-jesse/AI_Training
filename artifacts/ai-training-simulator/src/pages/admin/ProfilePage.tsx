import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClerk } from "@clerk/react";
import {
  User, Mail, Lock, Bell, ShieldCheck, Check,
  RefreshCw, AlertCircle, CheckCircle2, Eye, EyeOff, LogOut,
} from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Avatar color ────────────────────────────────────────────────────────────

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#14b8a6"];
function avatarColor(name: string) {
  if (!name) return PALETTE[0];
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

interface FieldError { field: string; message: string }

function flash(set: (s: SaveState) => void, result: "saved" | "error") {
  set(result);
  setTimeout(() => set("idle"), result === "saved" ? 2500 : 4000);
}

// ── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { score: 0, label: "", color: "" },
    { score: 1, label: "Very weak",  color: "bg-red-500" },
    { score: 2, label: "Weak",       color: "bg-orange-400" },
    { score: 3, label: "Fair",       color: "bg-amber-400" },
    { score: 4, label: "Good",       color: "bg-lime-500" },
    { score: 5, label: "Strong",     color: "bg-emerald-500" },
  ];
  return map[Math.min(score, 5)];
}

// ── Section card ─────────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, description, children, onSave, saveState, noBorder,
}: {
  icon: any; title: string; description: string; children: React.ReactNode;
  onSave?: () => void; saveState?: SaveState; noBorder?: boolean;
}) {
  return (
    <Card className={noBorder ? "border-0 shadow-none bg-transparent" : ""}>
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

// ── Field with inline error ───────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { localUser, clerkUser, isLoading } = useCurrentUser();
  const { signOut } = useClerk();

  // Local profile state (kept in sync after saves)
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (localUser && !profile) setProfile(localUser);
  }, [localUser]);

  // ── Profile section state ──────────────────────────────────────────────────
  const [name,     setName]     = useState("");
  const [username, setUsername] = useState("");
  const [nameErr,  setNameErr]  = useState("");
  const [unameErr, setUnameErr] = useState("");
  const [profileSave, setProfileSave] = useState<SaveState>("idle");

  // ── Email section state ────────────────────────────────────────────────────
  const [email,    setEmail]    = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailSave, setEmailSave] = useState<SaveState>("idle");

  // ── Password section state ─────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCurrent,setShowCurrent]= useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [currentErr, setCurrentErr] = useState("");
  const [newPwErr,   setNewPwErr]   = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [pwSave,     setPwSave]     = useState<SaveState>("idle");

  // ── Notifications state ────────────────────────────────────────────────────
  const [emailNotifs,  setEmailNotifs]  = useState(true);
  const [notifSave,    setNotifSave]    = useState<SaveState>("idle");

  // Populate from loaded profile
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setEmail(profile.email ?? "");
    setEmailNotifs(profile.emailNotificationsEnabled ?? true);
  }, [profile]);

  // ── PATCH helper ───────────────────────────────────────────────────────────

  const patch = async (body: object): Promise<{ ok: boolean; data?: any; field?: string; message?: string }> => {
    const r = await fetch(`${base}/api/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, field: data.field, message: data.message ?? data.error ?? "Something went wrong." };
    return { ok: true, data };
  };

  // ── Save: profile ──────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setNameErr(""); setUnameErr("");
    if (!name.trim()) { setNameErr("Name cannot be empty."); return; }
    if (username && !/^[a-z0-9_]{3,30}$/i.test(username.trim())) {
      setUnameErr("3–30 characters: letters, numbers, underscores only."); return;
    }
    setProfileSave("saving");
    const res = await patch({ name: name.trim(), username: username.trim().toLowerCase() || null });
    if (res.ok) {
      setProfile((p: any) => ({ ...p, ...res.data }));
      flash(setProfileSave, "saved");
    } else {
      if (res.field === "username") setUnameErr(res.message!);
      else if (res.field === "name") setNameErr(res.message!);
      flash(setProfileSave, "error");
    }
  };

  // ── Save: email ────────────────────────────────────────────────────────────

  const saveEmail = async () => {
    setEmailErr("");
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailErr("Please enter a valid email address."); return;
    }
    setEmailSave("saving");
    const res = await patch({ email: trimmed });
    if (res.ok) {
      setProfile((p: any) => ({ ...p, ...res.data }));
      flash(setEmailSave, "saved");
    } else {
      setEmailErr(res.message ?? "Failed to update email.");
      flash(setEmailSave, "error");
    }
  };

  // ── Save: password ─────────────────────────────────────────────────────────

  const savePassword = async () => {
    setCurrentErr(""); setNewPwErr(""); setConfirmErr("");
    let valid = true;
    if (!currentPw) { setCurrentErr("Please enter your current password."); valid = false; }
    if (!newPw)     { setNewPwErr("Please enter a new password."); valid = false; }
    else if (newPw.length < 8) { setNewPwErr("Must be at least 8 characters."); valid = false; }
    if (newPw && newPw !== confirmPw) { setConfirmErr("Passwords don't match."); valid = false; }
    if (!valid) return;
    setPwSave("saving");
    const res = await patch({ currentPassword: currentPw, newPassword: newPw });
    if (res.ok) {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      flash(setPwSave, "saved");
    } else {
      if (res.field === "currentPassword") setCurrentErr(res.message!);
      else if (res.field === "newPassword") setNewPwErr(res.message!);
      flash(setPwSave, "error");
    }
  };

  // ── Save: notifications ────────────────────────────────────────────────────

  const saveNotifs = async () => {
    setNotifSave("saving");
    const res = await patch({ emailNotificationsEnabled: emailNotifs });
    if (res.ok) {
      setProfile((p: any) => ({ ...p, ...res.data }));
      flash(setNotifSave, "saved");
    } else {
      flash(setNotifSave, "error");
    }
  };

  // ── Loading / no-user states ───────────────────────────────────────────────

  if (isLoading || !profile) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const displayName  = profile.name ?? clerkUser?.fullName ?? "User";
  const displayEmail = profile.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const isLocalAccount = profile.authProvider === "local_password";
  const strength = passwordStrength(newPw);

  return (
    <AdminLayout>
      {/* ── Hero header ── */}
      <div className="mb-8 flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg"
          style={{ backgroundColor: avatarColor(displayName) }}
        >
          {initials(displayName)}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground leading-tight">{displayName}</h1>
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize ring-1 ring-primary/20">
              <ShieldCheck className="w-3 h-3" />{profile.role ?? "learner"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground ring-1 ring-border">
              {isLocalAccount ? "Local account" : "Clerk / SSO"}
            </span>
          </div>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
            onClick={() => signOut({ redirectUrl: base || "/" })}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </Button>
        </div>
      </div>

      <div className="max-w-xl space-y-4">

        {/* ── Profile info ── */}
        <Section
          icon={User}
          title="Profile"
          description="Your display name and public username."
          onSave={saveProfile}
          saveState={profileSave}
        >
          <div className="space-y-4 mt-3">
            <Field label="Display name" error={nameErr}>
              <Input
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(""); }}
                placeholder="Your full name"
                className={nameErr ? "border-red-500/60 focus-visible:ring-red-500/30" : ""}
              />
            </Field>

            <Field label="Username" error={unameErr}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
                <Input
                  value={username}
                  onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setUnameErr(""); }}
                  placeholder="your_handle"
                  className={`pl-7 ${unameErr ? "border-red-500/60 focus-visible:ring-red-500/30" : ""}`}
                  maxLength={30}
                />
              </div>
              <p className="text-xs text-muted-foreground">Letters, numbers, and underscores. 3–30 characters.</p>
            </Field>
          </div>
        </Section>

        {/* ── Email ── */}
        <Section
          icon={Mail}
          title="Email address"
          description="Used for sign-in and notifications."
          onSave={saveEmail}
          saveState={emailSave}
        >
          <div className="mt-3">
            <Field label="Email" error={emailErr}>
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                placeholder="you@example.com"
                className={emailErr ? "border-red-500/60 focus-visible:ring-red-500/30" : ""}
              />
            </Field>
            {!isLocalAccount && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Your primary email is managed by your SSO provider and may re-sync on next login.
              </p>
            )}
          </div>
        </Section>

        {/* ── Password (local accounts only) ── */}
        {isLocalAccount && (
          <Section
            icon={Lock}
            title="Password"
            description="Change the password you use to sign in."
            onSave={savePassword}
            saveState={pwSave}
          >
            <div className="space-y-4 mt-3">
              <Field label="Current password" error={currentErr}>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPw}
                    onChange={e => { setCurrentPw(e.target.value); setCurrentErr(""); }}
                    placeholder="Enter current password"
                    className={`pr-10 ${currentErr ? "border-red-500/60 focus-visible:ring-red-500/30" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <Field label="New password" error={newPwErr}>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setNewPwErr(""); }}
                    placeholder="At least 8 characters"
                    className={`pr-10 ${newPwErr ? "border-red-500/60 focus-visible:ring-red-500/30" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPw && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="text-xs text-muted-foreground">{strength.label}</p>
                    )}
                  </div>
                )}
              </Field>

              <Field label="Confirm new password" error={confirmErr}>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setConfirmErr(""); }}
                  placeholder="Repeat new password"
                  className={confirmErr ? "border-red-500/60 focus-visible:ring-red-500/30" : ""}
                />
                {confirmPw && newPw && confirmPw === newPw && !confirmErr && (
                  <p className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
                    <Check className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </Field>
            </div>
          </Section>
        )}

        {/* ── Notifications ── */}
        <Section
          icon={Bell}
          title="Notifications"
          description="Control how we contact you."
          onSave={saveNotifs}
          saveState={notifSave}
        >
          <div className="mt-3">
            <div className="flex items-center justify-between gap-6 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Receive emails when modules are assigned or graded.</p>
              </div>
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
            </div>
          </div>
        </Section>

        {/* ── Account info ── */}
        <Section
          icon={ShieldCheck}
          title="Account"
          description="Read-only details about your account."
        >
          <div className="mt-3 divide-y divide-border/40">
            {[
              { label: "Role",          value: <span className="capitalize">{profile.role ?? "—"}</span> },
              { label: "User ID",       value: <span className="font-mono text-xs">{profile.userId}</span> },
              { label: "Auth provider", value: isLocalAccount ? "Local password" : "Clerk / SSO" },
              { label: "Member since",  value: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </AdminLayout>
  );
}
