// Option A — Command Center
// Concept: Enterprise mission control. Dark, precise, data-dense.
// Every detail signals that this is serious infrastructure — not an LMS.

export function CommandCenter() {
  const metrics = [
    { label: "Simulations run", value: "2.4M+", delta: "+18% mo/mo" },
    { label: "Avg. time-to-competency", value: "↓ 34%", delta: "vs. traditional training" },
    { label: "Knowledge retention", value: "91%", delta: "at 30-day mark" },
  ];

  const capabilities = [
    {
      icon: "⬡",
      title: "Adaptive branching AI",
      desc: "Scenarios respond to every learner decision. No two sessions are the same.",
    },
    {
      icon: "◈",
      title: "Real-time analytics",
      desc: "Identify skill gaps the moment they emerge. Act before they become problems.",
    },
    {
      icon: "◉",
      title: "Org-level controls",
      desc: "Role hierarchy, group assignments, module versioning, and full audit logs.",
    },
    {
      icon: "⬕",
      title: "Graded assessments",
      desc: "Structured rubrics with human-review queues and automated scoring.",
    },
  ];

  return (
    <div
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      className="min-h-screen bg-[#080c14] text-white overflow-hidden"
    >
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-10 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M10 2L2 7l8 5 8-5-8-5z" fill="white" opacity="0.9" />
              <path d="M2 13l8 5 8-5" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-wide text-white/90">Training Simulator</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs text-white/40 font-medium">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Platform</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Use cases</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Pricing</span>
          </nav>
          <button className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors">
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-10 pt-24 pb-20">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 mb-10 px-3 py-1.5 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 text-[11px] font-mono text-[#60a5fa]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse" />
          ENTERPRISE SIMULATION ENGINE — LIVE
        </div>

        <h1 className="text-[72px] leading-[1.02] font-black tracking-tight mb-6 max-w-3xl">
          Train smarter.<br />
          <span className="text-[#2563eb]">Measure</span> everything.
        </h1>

        <p className="text-lg text-white/50 max-w-xl mb-12 leading-relaxed">
          AI-driven simulations that adapt to every learner decision — so you can identify skill gaps before they become performance problems.
        </p>

        <div className="flex items-center gap-4 mb-20">
          <button className="px-7 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[#2563eb]/25">
            Sign in to your workspace →
          </button>
          <button className="px-7 py-3.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-medium text-sm transition-all">
            Watch demo
          </button>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden mb-24">
          {metrics.map((m) => (
            <div key={m.label} className="bg-[#080c14] px-8 py-6">
              <p className="text-3xl font-black text-white mb-1">{m.value}</p>
              <p className="text-xs text-white/30 mb-0.5">{m.label}</p>
              <p className="text-[10px] text-[#60a5fa] font-mono">{m.delta}</p>
            </div>
          ))}
        </div>

        {/* Capabilities grid */}
        <div>
          <p className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em] mb-8">
            Platform capabilities
          </p>
          <div className="grid grid-cols-2 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="bg-[#080c14] p-8 hover:bg-[#0d1220] transition-colors group"
              >
                <span className="text-2xl text-[#2563eb] mb-4 block">{c.icon}</span>
                <h3 className="font-bold text-sm text-white mb-2">{c.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-10 py-6 flex items-center justify-between">
        <p className="text-xs text-white/20 font-mono">© 2026 Training Simulator</p>
        <p className="text-xs text-white/20 font-mono">Enterprise · SSO · SOC 2</p>
      </footer>
    </div>
  );
}
