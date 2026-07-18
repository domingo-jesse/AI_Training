import { SignIn } from "@clerk/react";
import { ShieldCheck } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminSignInPage() {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* Brand Panel */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-sidebar border-r border-sidebar-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="Training Simulator Logo" className="w-10 h-10" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">Training Simulator</span>
        </div>
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-violet-400 font-semibold text-sm tracking-widest uppercase">Admin Portal</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Manage your training platform.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg">
            Build modules, track learner progress, review submissions, and manage your organisation — all in one place.
          </p>
        </div>
        <div className="relative z-10 text-sm text-sidebar-foreground/40">
          © {new Date().getFullYear()} Training Simulator
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 gap-6">
        <div className="flex items-center gap-2 md:hidden mb-2">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <span className="text-violet-400 font-semibold text-sm tracking-widest uppercase">Admin Portal</span>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/admin/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
        <p className="text-sm text-muted-foreground">
          Learner?{" "}
          <a href={`${basePath}/sign-in`} className="text-primary hover:underline font-medium">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
