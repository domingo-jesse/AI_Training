import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function GradingPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Grading Center</h1>
        <p className="text-muted-foreground mt-1">Review user submissions and evaluate performance.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckSquare className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Grading Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The manual and AI grading workflows are under development.
        </p>
      </Card>
    </AdminLayout>
  );
}
