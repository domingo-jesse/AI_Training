import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Redirect } from "wouter";

export default function DebugLogsPage() {
  const { localUser, isLoading } = useCurrentUser();
  
  if (!isLoading && localUser?.role !== 'developer') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Debug Logs</h1>
        <p className="text-muted-foreground mt-1">Developer tool: system events and application logs.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Log Viewer Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The real-time log viewer interface is under development.
        </p>
      </Card>
    </AdminLayout>
  );
}
