import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, LineChart, Award, Calendar, Clock, PlayCircle, BookMarked, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LearnerPortal() {
  const learnerFeatures = [
    {
      title: 'My Training',
      description: 'Access your assigned modules and interactive simulations.',
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'Progress Report',
      description: 'View detailed performance metrics and AI feedback.',
      icon: LineChart,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Certificates',
      description: 'Download certificates for completed programs.',
      icon: Award,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Schedule',
      description: 'Upcoming live sessions and assignment deadlines.',
      icon: Calendar,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      title: 'Resource Library',
      description: 'Supplementary materials and knowledge base.',
      icon: BookMarked,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'History',
      description: 'Review transcripts of past simulation exercises.',
      icon: History,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10'
    }
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Learner Portal
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Access your assigned training modules, engage with AI simulations, and track your professional development.
            </p>
          </div>
          
          <Card className="bg-primary/5 border-primary/20 shadow-none w-full md:w-auto shrink-0">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Up Next</span>
                <span className="font-semibold text-foreground">Conflict Resolution 101</span>
              </div>
              <Button size="sm" className="ml-4">Start</Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {learnerFeatures.map((feature, i) => (
            <Card key={i} className="shadow-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground mb-4">
                  {feature.description}
                </CardDescription>
                <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                  Access <span className="ml-1">→</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
