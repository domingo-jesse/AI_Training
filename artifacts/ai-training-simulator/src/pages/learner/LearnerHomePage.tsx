import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlayCircle, Trophy, BookOpen, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function LearnerHomePage() {
  const { localUser } = useCurrentUser();

  return (
    <LearnerLayout>
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground">Welcome, {localUser?.name?.split(' ')[0] || 'Learner'}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Ready to continue your training?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Next Module</h2>
            </div>
            <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardContent className="p-8 relative z-10 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <PlayCircle className="w-12 h-12" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2">Customer Escalation Scenario</h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2">Learn how to de-escalate high-stress customer interactions using adaptive empathetic language patterns.</p>
                  <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
                    <span className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="w-4 h-4 mr-1"/> 45 mins</span>
                    <span className="flex items-center text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">In Progress (60%)</span>
                  </div>
                </div>
                <div className="shrink-0 mt-4 md:mt-0">
                  <Link href="/learner/workspace">
                    <Button size="lg" className="w-full md:w-auto shadow-md shadow-primary/20">Resume Training</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Assigned to You</h2>
              <Link href="/learner/modules" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Product Knowledge Base</CardTitle>
                    <CardDescription>Required by your manager</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-muted-foreground"><BookOpen className="w-4 h-4 mr-1"/> 3 Lessons</span>
                      <span className="text-muted-foreground">Due in 5 days</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> My Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Overall Mastery</span>
                  <span className="font-bold text-primary">72%</span>
                </div>
                <Progress value={72} className="h-2.5" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">4</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Modules Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">12</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Hours Trained</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LearnerLayout>
  );
}
