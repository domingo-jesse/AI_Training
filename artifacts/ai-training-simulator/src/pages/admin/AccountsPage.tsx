import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function AccountsPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Account Management</h1>
        <p className="text-muted-foreground mt-1">Manage users, teams, roles, and permissions.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">User Administration Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The user table and RBAC management tools are currently under construction.
        </p>
      </Card>
    </AdminLayout>
  );
}
