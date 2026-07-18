import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function ProgressPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Progress Tracking</h1>
        <p className="text-muted-foreground mt-1">Analytics on completion rates and skill mastery.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <BarChart className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Analytics Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          Dashboards and charts for organizational tracking are currently being built.
        </p>
      </Card>
    </AdminLayout>
  );
}
