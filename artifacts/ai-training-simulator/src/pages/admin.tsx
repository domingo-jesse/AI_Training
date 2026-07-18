import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, Database, Activity, FileText, LayoutTemplate, MessageSquare, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPortal() {
  const adminFeatures = [
    {
      title: 'User Management',
      description: 'Invite users, manage roles, and organize cohorts.',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Training Programs',
      description: 'Create and assign curriculum tracks and modules.',
      icon: LayoutTemplate,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      title: 'Scenario Builder',
      description: 'Author AI-driven interactive training scenarios.',
      icon: Database,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'System Analytics',
      description: 'Platform-wide usage metrics and performance data.',
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Feedback & Logs',
      description: 'Review transcripts and AI interaction logs.',
      icon: MessageSquare,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Compliance Reports',
      description: 'Generate audit-ready completion certificates.',
      icon: FileText,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
    {
      title: 'Security Settings',
      description: 'Manage SSO, API keys, and data retention policies.',
      icon: Shield,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    },
    {
      title: 'Platform Settings',
      description: 'Configure global appearance and integrations.',
      icon: Settings,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10'
    }
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium self-start mb-2">
            <Shield className="w-4 h-4" />
            <span>Administrator Access</span>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
            Admin Portal
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage training programs, users, and system settings. Oversee the entire organization's learning capabilities and performance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {adminFeatures.map((feature, i) => (
            <Card key={i} className="shadow-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md group cursor-pointer">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                <CardDescription className="line-clamp-2">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 justify-between">
                  Manage <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">→</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
