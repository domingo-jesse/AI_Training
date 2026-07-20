import { Lock, ArrowLeft } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Public sign-up is disabled — accounts are admin-created only.
 * This page is shown if someone navigates directly to /sign-up.
 *
 * If you need to allow sign-up for a specific user, have an admin add them
 * via the Accounts page first. They'll be prompted to set a password on
 * first sign-in.
 */
export default function SignUpPage() {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* ── Brand panel ── */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-sidebar border-r border-sidebar-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-60" />
        <div className="relative z-10 flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="Training Simulator" className="w-10 h-10" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">Training Simulator</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Accounts are created by your administrator.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg">
            Your organization's admin will add you to the platform and let you know when you're ready to sign in.
          </p>
        </div>
        <div className="relative z-10 text-sm text-sidebar-foreground/40">
          © {new Date().getFullYear()} Training Simulator
        </div>
      </div>

      {/* ── Invite-only message ── */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-display font-semibold text-white mb-2">
              Invitation required
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              New accounts on Training Simulator are created by organization admins.
              If you've been added to an organization, sign in with the email address
              your admin registered.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <a
              href={`${basePath}/sign-in`}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign in
            </a>
            <a
              href={`${basePath}/sign-in`}
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </a>
          </div>

          <p className="text-xs text-muted-foreground/60 pt-2">
            Contact your organization's admin if you believe this is a mistake.
          </p>
        </div>
      </div>
    </div>
  );
}
