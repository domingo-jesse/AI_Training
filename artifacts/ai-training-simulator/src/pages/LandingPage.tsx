import { Link } from "wouter";
import { motion } from "framer-motion";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const outcomes = [
  { stat: "91%", label: "Knowledge retention rate at 30 days" },
  { stat: "3×",  label: "Faster time-to-competency vs. static courseware" },
  { stat: "34%", label: "Reduction in manager coaching hours" },
];

const steps = [
  {
    n: "01",
    title: "Admin builds the scenario",
    body: "Use the module builder to craft branching conversation simulations — no coding required.",
  },
  {
    n: "02",
    title: "Learners complete on their schedule",
    body: "Assigned modules appear in their queue. Adaptive AI tailors the path to each person's decisions.",
  },
  {
    n: "03",
    title: "Managers see the full picture",
    body: "Real-time dashboards surface skill gaps, grading queues, and org-wide progress at a glance.",
  },
];

const quotes = [
  {
    text: "We onboarded 200 reps in half the time. The simulations actually mirrored our real sales calls.",
    name: "Sarah K.",
    role: "VP Enablement, Fintech co.",
  },
  {
    text: "The gap analysis alone saved us from a bad product launch. We caught it in simulation, not in the field.",
    name: "James R.",
    role: "L&D Director, Healthcare SaaS",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-indigo-100">
      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="" className="w-8 h-8" />
          <span className="font-semibold text-sm text-gray-900 tracking-tight">Training Simulator</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <span className="hover:text-gray-900 cursor-default transition-colors">Platform</span>
          <span className="hover:text-gray-900 cursor-default transition-colors">Use cases</span>
          <span className="hover:text-gray-900 cursor-default transition-colors">Pricing</span>
        </nav>

        <Link href="/sign-in">
          <button className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm">
            Sign in
          </button>
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-10 pt-20 pb-24 text-center">
        <motion.div {...fade(0)}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 mb-8">
            Trusted by 400+ training teams
          </div>
        </motion.div>

        <motion.h1
          {...fade(0.08)}
          className="text-6xl md:text-[68px] font-black tracking-tight mb-6 text-gray-950 leading-[1.05]"
        >
          Your workforce learns best
          <br />
          <span className="text-indigo-600">by doing, not watching.</span>
        </motion.h1>

        <motion.p
          {...fade(0.15)}
          className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Deploy AI-driven simulations that adapt to each learner in real time — so you can close skill gaps before they affect performance.
        </motion.p>

        <motion.div {...fade(0.22)} className="flex items-center justify-center gap-4 mb-16">
          <Link href="/sign-in">
            <button className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0">
              Sign in to your workspace
            </button>
          </Link>
          <button
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-base hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            See how it works ↓
          </button>
        </motion.div>

        {/* Outcome stats */}
        <motion.div
          {...fade(0.28)}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
        >
          {outcomes.map((o) => (
            <div
              key={o.stat}
              className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors"
            >
              <p className="text-4xl font-black text-indigo-600 mb-2">{o.stat}</p>
              <p className="text-sm text-gray-500 leading-snug">{o.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="bg-gray-50 border-y border-gray-100 py-20"
      >
        <div className="max-w-5xl mx-auto px-10">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-12 text-center"
          >
            How it works
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex flex-col"
              >
                <span className="text-xs font-mono text-indigo-500 font-bold mb-3">{s.n}</span>
                <h3 className="font-bold text-lg text-gray-900 mb-3">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-5xl mx-auto px-10 py-20">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-12 text-center"
        >
          What teams say
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotes.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="p-8 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-[15px] text-gray-700 leading-relaxed mb-6 italic">"{q.text}"</p>
              <div>
                <p className="font-semibold text-sm text-gray-900">{q.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{q.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-indigo-600 py-16 text-center"
      >
        <h2 className="text-3xl font-black text-white mb-4">
          Ready to see it in action?
        </h2>
        <p className="text-indigo-200 mb-8 text-base">
          Your team is waiting. Sign in and build your first simulation in minutes.
        </p>
        <Link href="/sign-in">
          <button className="px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-base hover:bg-indigo-50 transition-colors shadow-xl">
            Sign in to Training Simulator
          </button>
        </Link>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="px-10 py-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Training Simulator. All rights reserved.</p>
        <p className="text-xs text-gray-400">SOC 2 · GDPR · Enterprise SSO</p>
      </footer>
    </div>
  );
}
