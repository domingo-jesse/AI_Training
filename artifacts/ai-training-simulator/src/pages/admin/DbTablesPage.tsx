import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Redirect } from "wouter";

export default function DbTablesPage() {
  const { localUser, isLoading } = useCurrentUser();
  
  if (!isLoading && localUser?.role !== 'developer') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Database Tables</h1>
        <p className="text-muted-foreground mt-1">Developer tool: direct read access to database records.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">DB Viewer Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The interactive database table viewer is currently being built.
        </p>
      </Card>
    </AdminLayout>
  );
}
