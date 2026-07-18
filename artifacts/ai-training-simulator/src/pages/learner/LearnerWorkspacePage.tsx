import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { Card } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function LearnerWorkspacePage() {
  return (
    <LearnerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Module Workspace</h1>
        <p className="text-muted-foreground mt-1">Your active training scenario environment.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed h-[500px]">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckSquare className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Interactive Workspace Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The immersive AI simulation interface is currently under construction.
        </p>
      </Card>
    </LearnerLayout>
  );
}
