import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { Card } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function LearnerProgressPage() {
  return (
    <LearnerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Progress & Results</h1>
        <p className="text-muted-foreground mt-1">Review your performance and grading history.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <BarChart className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Results Dashboard Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          Detailed metrics and feedback on your completed modules are being built.
        </p>
      </Card>
    </LearnerLayout>
  );
}
