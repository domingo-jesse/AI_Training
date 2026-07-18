import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* Brand Panel */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-sidebar border-r border-sidebar-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="NexusAI Logo" className="w-10 h-10" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">NexusAI</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">Welcome back to your workspace.</h1>
          <p className="text-sidebar-foreground/70 text-lg">Sign in to access your modules, review trainee progress, or continue your active simulations.</p>
        </div>
        <div className="relative z-10 text-sm text-sidebar-foreground/40">
          © {new Date().getFullYear()} NexusAI Platform
        </div>
      </div>
      
      {/* Form Panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}
