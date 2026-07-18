import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure platform preferences and defaults.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Settings className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Settings Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          Workspace settings and global configuration options are under development.
        </p>
      </Card>
    </AdminLayout>
  );
}
