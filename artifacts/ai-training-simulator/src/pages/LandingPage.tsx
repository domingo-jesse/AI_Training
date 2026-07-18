import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BrainCircuit, Activity, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="h-20 border-b border-border/40 px-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="NexusAI Logo" className="w-10 h-10" />
          <span className="font-display font-bold text-2xl tracking-tight">NexusAI</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="font-medium hover:bg-primary/10 hover:text-primary">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="font-medium px-6 shadow-md shadow-primary/20">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Enterprise Simulation Engine v2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-tight">
            Train your workforce with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">intelligent simulations</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deploy dynamic, AI-driven scenarios that adapt to learner decisions in real-time. Uncover skill gaps and accelerate mastery with authoritative analytics.
          </p>

          <div className="flex items-center justify-center gap-6 pt-8">
            <Link href="/sign-up">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                Start Training <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-border/60 hover:bg-primary/5 hover:border-primary/30">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 w-full px-6"
        >
          {[
            { icon: BrainCircuit, title: "Adaptive Scenarios", desc: "Simulations dynamically branch based on user inputs and real-time AI evaluation." },
            { icon: Activity, title: "Deep Analytics", desc: "Track granular metrics, identify bottlenecks, and measure competency progression." },
            { icon: ShieldCheck, title: "Enterprise Ready", desc: "Role-based access control, SSO, and comprehensive audit logs for compliance." }
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
        <p>© {new Date().getFullYear()} NexusAI Enterprise Training. All rights reserved.</p>
      </footer>
    </div>
  );
}
