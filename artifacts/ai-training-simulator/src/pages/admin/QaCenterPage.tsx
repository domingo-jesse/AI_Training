import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Beaker } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Redirect } from "wouter";

export default function QaCenterPage() {
  const { localUser, isLoading } = useCurrentUser();
  
  if (!isLoading && localUser?.role !== 'developer') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">QA Test Center</h1>
        <p className="text-muted-foreground mt-1">Developer tool: test scenarios and run automated suites.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Beaker className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">QA Center Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The quality assurance and automated testing hub is under construction.
        </p>
      </Card>
    </AdminLayout>
  );
}
