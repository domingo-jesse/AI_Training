// Option B — Human Focus
// Concept: Confidence through clarity. Clean white, warm typography, trust signals.
// Feels like Notion meets Lattice — thoughtful, human-centered L&D.

export function HumanFocus() {
  const outcomes = [
    { stat: "91%", label: "Knowledge retention rate at 30 days" },
    { stat: "3×", label: "Faster time-to-competency vs. static courseware" },
    { stat: "34%", label: "Reduction in manager coaching hours" },
  ];

  const steps = [
    { n: "01", title: "Admin builds the scenario", body: "Use the module builder to craft branching conversation simulations — no coding required." },
    { n: "02", title: "Learners complete on their schedule", body: "Assigned modules appear in their queue. Adaptive AI tailors the path to each person's decisions." },
    { n: "03", title: "Managers see the full picture", body: "Real-time dashboards surface skill gaps, grading queues, and org-wide progress at a glance." },
  ];

  const quotes = [
    { text: "We onboarded 200 reps in half the time. The simulations actually mirrored our real sales calls.", name: "Sarah K.", role: "VP Enablement, Fintech co." },
    { text: "The gap analysis alone saved us from a bad product launch. We caught it in simulation, not in the field.", name: "James R.", role: "L&D Director, Healthcare SaaS" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }} className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M10 2L2 7l8 5 8-5-8-5z" fill="white" opacity="0.9" />
              <path d="M2 13l8 5 8-5" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-gray-900">Training Simulator</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <span className="hover:text-gray-900 cursor-pointer transition-colors">Platform</span>
          <span className="hover:text-gray-900 cursor-pointer transition-colors">Use cases</span>
          <span className="hover:text-gray-900 cursor-pointer transition-colors">Pricing</span>
        </nav>
        <button className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-10 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 mb-8">
          Trusted by 400+ training teams
        </div>

        <h1
          className="text-6xl font-black tracking-tight mb-6 text-gray-950 leading-[1.06]"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          Your workforce learns best<br />
          <span className="text-indigo-600">by doing, not watching.</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Deploy AI-driven simulations that adapt to each learner in real time — so you can close skill gaps before they affect performance.
        </p>

        <div className="flex items-center justify-center gap-4 mb-16">
          <button className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5">
            Sign in to your workspace
          </button>
          <button className="px-8 py-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-base hover:border-gray-300 hover:bg-gray-50 transition-all">
            See how it works ↓
          </button>
        </div>

        {/* Outcome stats */}
        <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
          {outcomes.map((o) => (
            <div key={o.stat} className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-4xl font-black text-indigo-600 mb-2">{o.stat}</p>
              <p className="text-sm text-gray-500 leading-snug">{o.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-12 text-center">
            How it works
          </p>
          <div className="grid grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col">
                <span className="text-xs font-mono text-indigo-500 font-bold mb-3">{s.n}</span>
                <h3 className="font-bold text-lg text-gray-900 mb-3">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-10 py-20">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-12 text-center">
          What teams say
        </p>
        <div className="grid grid-cols-2 gap-6">
          {quotes.map((q) => (
            <div key={q.name} className="p-8 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <p className="text-[15px] text-gray-700 leading-relaxed mb-6 italic">"{q.text}"</p>
              <div>
                <p className="font-semibold text-sm text-gray-900">{q.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{q.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-indigo-600 py-16 text-center">
        <h2 className="text-3xl font-black text-white mb-4">Ready to see it in action?</h2>
        <p className="text-indigo-200 mb-8 text-base">Your team is waiting. Sign in and build your first simulation in minutes.</p>
        <button className="px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-base hover:bg-indigo-50 transition-colors">
          Sign in to Training Simulator
        </button>
      </section>

      <footer className="px-10 py-6 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">© 2026 Training Simulator. All rights reserved.</p>
        <p className="text-xs text-gray-400">SOC 2 · GDPR · Enterprise SSO</p>
      </footer>
    </div>
  );
}
