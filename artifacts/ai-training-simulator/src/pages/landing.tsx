import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, BrainCircuit, Activity, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-sidebar flex items-center justify-center border border-sidebar-border shadow-sm">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight text-foreground">
            Nexus<span className="text-primary">AI</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <span className="cursor-not-allowed hover:text-foreground transition-colors">Platform</span>
          <span className="cursor-not-allowed hover:text-foreground transition-colors">Solutions</span>
          <span className="cursor-not-allowed hover:text-foreground transition-colors">Resources</span>
          <span className="cursor-not-allowed hover:text-foreground transition-colors">Enterprise</span>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Button asChild className="rounded-full px-6 shadow-md shadow-primary/20">
            <Link href="/dashboard">
              Enter as Guest <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 z-10 max-w-4xl mx-auto mt-12 mb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Activity className="w-4 h-4" />
          <span>v2.0 Simulation Engine Now Live</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-display font-semibold tracking-tight text-foreground mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          Accelerate capabilities with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            intelligent simulation
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          The enterprise standard for AI-powered workforce training. Deploy realistic, branchable scenarios to upskill your teams at unprecedented scale.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Button asChild size="lg" className="rounded-full px-8 h-14 text-base shadow-lg shadow-primary/25 group">
            <Link href="/dashboard">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 text-base border-border hover:bg-muted/50">
            <Link href="/dashboard">
              View Interactive Demo
            </Link>
          </Button>
        </div>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-medium text-lg text-foreground">Adaptive Scenarios</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Training environments that react in real-time to user decisions, driven by state-of-the-art LLMs.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-medium text-lg text-foreground">Enterprise Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SOC2 compliant architecture with private model deployments and strict data boundaries.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-medium text-lg text-foreground">Cohort Analytics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Granular telemetry on user performance, identifying skill gaps before they impact production.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
