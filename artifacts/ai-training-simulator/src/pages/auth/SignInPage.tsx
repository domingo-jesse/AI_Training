import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* ── Brand panel ── */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-sidebar border-r border-sidebar-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-60" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="Training Simulator" className="w-10 h-10" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">Training Simulator</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Your team's training, all in one place.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg">
            Sign in to access your modules, track progress, and build intelligent simulations — wherever your role takes you.
          </p>
        </div>

        <div className="relative z-10 text-sm text-sidebar-foreground/40">
          © {new Date().getFullYear()} Training Simulator
        </div>
      </div>

      {/* ── Sign-in form ── */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 gap-6">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden mb-2">
          <img src={`${basePath}/logo.svg`} alt="Training Simulator" className="w-7 h-7" />
          <span className="font-display font-semibold text-white">Training Simulator</span>
        </div>

        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      </div>
    </div>
  );
}
