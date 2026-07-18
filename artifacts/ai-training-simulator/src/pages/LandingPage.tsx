import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, BookOpen, ArrowRight, BrainCircuit, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="h-20 border-b border-border/40 px-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="Training Simulator Logo" className="w-10 h-10" />
          <span className="font-display font-bold text-2xl tracking-tight">Training Simulator</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Enterprise Simulation Engine v2.0
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-tight">
            Train your workforce with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              intelligent simulations
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deploy dynamic, AI-driven scenarios that adapt to learner decisions in real-time. Uncover skill gaps and accelerate mastery with authoritative analytics.
          </p>

          {/* Portal cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-8"
          >
            {/* Learner portal */}
            <Link href="/sign-in">
              <div className="group relative flex flex-col items-start p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-primary/10">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Learner Portal</h2>
                <p className="text-sm text-muted-foreground mb-4 text-left">
                  Access your training modules, track progress, and complete simulations.
                </p>
                <div className="flex items-center gap-1 text-primary text-sm font-medium mt-auto">
                  Sign in as Learner <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Admin portal */}
            <Link href="/admin/sign-in">
              <div className="group relative flex flex-col items-start p-6 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/60 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-violet-500/10">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Admin Portal</h2>
                <p className="text-sm text-muted-foreground mb-4 text-left">
                  Build modules, manage learners, review submissions, and view analytics.
                </p>
                <div className="flex items-center gap-1 text-violet-400 text-sm font-medium mt-auto">
                  Sign in as Admin <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature row */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 w-full px-6"
        >
          {[
            { icon: BrainCircuit, title: "Adaptive Scenarios", desc: "Simulations dynamically branch based on user inputs and real-time AI evaluation." },
            { icon: Activity, title: "Deep Analytics", desc: "Track granular metrics, identify bottlenecks, and measure competency progression." },
            { icon: Zap, title: "Enterprise Ready", desc: "Role-based access control, SSO, and comprehensive audit logs for compliance." },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/40 mt-20">
        <p>© {new Date().getFullYear()} Training Simulator. All rights reserved.</p>
      </footer>
    </div>
  );
}
