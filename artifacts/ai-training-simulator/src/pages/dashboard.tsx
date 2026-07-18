import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, PlayCircle, Trophy, Users, CheckCircle2 } from 'lucide-react';
import { useGetHealth, getGetHealthQueryKey } from '@workspace/api-client-react';

export default function Dashboard() {
  const { data: healthData, isLoading: isHealthLoading } = useGetHealth({
    query: { queryKey: getGetHealthQueryKey() }
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Welcome back, Alex
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your training programs today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isHealthLoading ? (
              <Badge variant="outline" className="px-3 py-1 animate-pulse bg-muted/50 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 mr-2" />
                Connecting...
              </Badge>
            ) : healthData?.status === 'ok' ? (
              <Badge variant="outline" className="px-3 py-1 bg-green-500/10 text-green-600 border-green-500/20 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                API Status: OK
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1 bg-destructive/10 text-destructive border-destructive/20 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-destructive mr-2" />
                API Offline
              </Badge>
            )}
            <Button>
              <PlayCircle className="w-4 h-4 mr-2" />
              Resume Last Module
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-border/50 hover:border-border transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10">+12% this week</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-display font-semibold">24h</span>
                <span className="text-sm font-medium text-muted-foreground">Training Time</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-border/50 hover:border-border transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-display font-semibold">12</span>
                <span className="text-sm font-medium text-muted-foreground">Modules Completed</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 hover:border-border transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-display font-semibold">89%</span>
                <span className="text-sm font-medium text-muted-foreground">Average Score</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 hover:border-border transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-display font-semibold">Top 5%</span>
                <span className="text-sm font-medium text-muted-foreground">Cohort Ranking</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold">Recent Modules</h2>
              <Button variant="ghost" size="sm" className="text-primary">View All</Button>
            </div>
            
            <div className="flex flex-col gap-4">
              {[
                { title: 'Advanced Negotiation Scenarios', status: 'In Progress', progress: 65, duration: '45 mins', type: 'Interactive' },
                { title: 'Compliance & Ethics 2024', status: 'Not Started', progress: 0, duration: '30 mins', type: 'Required' },
                { title: 'Crisis Management Simulation', status: 'Completed', progress: 100, duration: '60 mins', type: 'Simulation' },
              ].map((module, i) => (
                <Card key={i} className="shadow-sm border-border/50 hover:border-primary/30 transition-all duration-300 group cursor-pointer overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1 bg-muted group-hover:bg-primary transition-colors duration-300" />
                    <CardContent className="p-5 flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-normal bg-muted/50">{module.type}</Badge>
                          {module.status === 'Required' && <Badge variant="destructive" className="text-xs font-normal">Required</Badge>}
                        </div>
                        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{module.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {module.duration}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{module.status}</span>
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-32 flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Progress</span>
                          <span>{module.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${module.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                            style={{ width: `${module.progress}%` }} 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-display font-semibold">Activity Feed</h2>
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-0">
                <div className="flex flex-col relative before:absolute before:inset-y-0 before:left-8 before:w-px before:bg-border/50 before:z-0">
                  {[
                    { title: 'Completed Crisis Management', time: '2 hours ago', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { title: 'Earned "Master Negotiator" Badge', time: '1 day ago', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { title: 'Started Advanced Negotiation', time: '2 days ago', icon: PlayCircle, color: 'text-primary', bg: 'bg-primary/10' },
                    { title: 'Logged in from new device', time: '1 week ago', icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' },
                  ].map((event, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 relative z-10 hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-full ${event.bg} flex items-center justify-center shrink-0 border border-background shadow-sm`}>
                        <event.icon className={`w-4 h-4 ${event.color}`} />
                      </div>
                      <div className="flex flex-col gap-0.5 pt-1.5">
                        <span className="text-sm font-medium text-foreground">{event.title}</span>
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
