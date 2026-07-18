import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function AssignmentsPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Assignment Management</h1>
        <p className="text-muted-foreground mt-1">Assign modules to learners and track deadlines.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Assignments Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The assignment table and workflow are currently under construction. Check back soon.
        </p>
      </Card>
    </AdminLayout>
  );
}
