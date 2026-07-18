import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

export default function ModuleBuilderPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Module Builder</h1>
        <p className="text-muted-foreground mt-1">Create interactive simulation modules and scenarios.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Layers className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Visual Builder Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The node-based simulation builder and scenario editor is under active development.
        </p>
      </Card>
    </AdminLayout>
  );
}
