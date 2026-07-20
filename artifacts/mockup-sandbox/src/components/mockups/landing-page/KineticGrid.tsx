// Option C — Kinetic Grid
// Concept: Energy in structure. Deep gradient background, bold oversized type,
// features shown as live "instrument panels" — dashboard-within-a-landing-page.

export function KineticGrid() {
  const features = [
    {
      emoji: "🧠",
      title: "AI-Adaptive Paths",
      body: "Every branch, every choice — the simulation reshapes itself around the learner's decisions.",
      tag: "Core Engine",
    },
    {
      emoji: "📊",
      title: "Live Analytics",
      body: "Track attempt outcomes, competency heat maps, and cohort benchmarks as they happen.",
      tag: "Insights",
    },
    {
      emoji: "🎯",
      title: "Targeted Assignments",
      body: "Push the right module to the right person. Groups, roles, due dates — all in one action.",
      tag: "Delivery",
    },
    {
      emoji: "✅",
      title: "Grading & Feedback",
      body: "Human-review queues, automated rubrics, and instant score reports for every submission.",
      tag: "Assessment",
    },
    {
      emoji: "🔒",
      title: "Enterprise Security",
      body: "SSO, role-based access, and a full audit trail. Compliant by design, not by accident.",
      tag: "Security",
    },
    {
      emoji: "🏢",
      title: "Multi-Org Ready",
      body: "Run isolated orgs with their own modules, teams, and analytics under one platform.",
      tag: "Scale",
    },
  ];

  const stackItems = [
    { label: "Simulations completed", value: "2,401,883", bar: 92 },
    { label: "Average score", value: "84.2 / 100", bar: 84 },
    { label: "Modules active", value: "1,240", bar: 67 },
    { label: "Learners onboarded", value: "48,900", bar: 78 },
  ];

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b3e 100%)",
      }}
      className="min-h-screen text-white"
    >
      {/* Nav */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M10 2L2 7l8 5 8-5-8-5z" fill="white" opacity="0.9" />
              <path d="M2 13l8 5 8-5" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
            </svg>
          </div>
          <span className="font-bold text-sm">Training Simulator</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/40">
          <span className="hover:text-white/70 cursor-pointer transition-colors">Platform</span>
          <span className="hover:text-white/70 cursor-pointer transition-colors">Pricing</span>
          <span className="hover:text-white/70 cursor-pointer transition-colors">Enterprise</span>
        </nav>
        <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-violet-900/40">
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-10 pt-20 pb-16">
        <div className="flex items-start gap-16">
          {/* Left — copy */}
          <div className="flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[11px] font-mono mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Simulation engine online
            </div>

            <h1 className="text-[60px] font-black leading-[1.04] tracking-tight mb-6">
              Close skill gaps
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                before they hurt.
              </span>
            </h1>

            <p className="text-base text-white/50 leading-relaxed mb-10">
              Deploy AI-powered simulations that mirror real work situations. Every decision branches the scenario. Every result feeds your analytics.
            </p>

            <div className="flex items-center gap-3">
              <button className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-violet-900/40">
                Sign in to your workspace →
              </button>
              <button className="px-7 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 font-medium text-sm transition-all">
                Watch demo
              </button>
            </div>
          </div>

          {/* Right — live stats panel */}
          <div className="flex-1 max-w-sm bg-white/[0.04] rounded-2xl border border-white/[0.08] p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Platform activity</p>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="space-y-5">
              {stackItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] text-white/40">{item.label}</p>
                    <p className="text-xs font-mono font-bold text-white/80">{item.value}</p>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                      style={{ width: `${item.bar}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-10 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/[0.07]" />
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Everything your training org needs</p>
          <div className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-[9px] font-mono text-white/25 uppercase tracking-widest pt-1">{f.tag}</span>
              </div>
              <h3 className="font-bold text-sm text-white mb-2">{f.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section
        className="mx-10 mb-16 rounded-3xl p-14 text-center"
        style={{ background: "linear-gradient(135deg, #4c1d95 0%, #1e3a8a 100%)" }}
      >
        <h2 className="text-3xl font-black mb-3">Ready to run your first simulation?</h2>
        <p className="text-white/60 mb-8 text-base">Sign in and build your first AI-powered training module in under 10 minutes.</p>
        <button className="px-8 py-4 rounded-2xl bg-white text-indigo-900 font-black text-base hover:bg-indigo-50 transition-colors shadow-xl">
          Sign in to Training Simulator →
        </button>
      </section>

      <footer className="border-t border-white/[0.06] px-10 py-6 flex items-center justify-between">
        <p className="text-xs text-white/20 font-mono">© 2026 Training Simulator</p>
        <p className="text-xs text-white/20 font-mono">SOC 2 TYPE II · ENTERPRISE SSO · GDPR</p>
      </footer>
    </div>
  );
}
