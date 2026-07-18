import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function ModulesPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Manage Modules</h1>
        <p className="text-muted-foreground mt-1">View, edit, and organize all existing training modules.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Module Library Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The module index and library management interface is under construction.
        </p>
      </Card>
    </AdminLayout>
  );
}
