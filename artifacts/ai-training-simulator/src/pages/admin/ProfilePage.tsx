import { AdminLayout } from "@/components/layout/AdminLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ProfilePage() {
  const { localUser, clerkUser } = useCurrentUser();
  const { signOut } = useClerk();

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
        </div>
        <Button variant="outline" onClick={() => signOut({ redirectUrl: basePath || "/" })}>
          Sign Out
        </Button>
      </div>
      
      <div className="grid gap-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {localUser?.name?.charAt(0) || clerkUser?.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-medium">{localUser?.name || clerkUser?.fullName || 'User'}</h3>
                <p className="text-muted-foreground">{localUser?.email || clerkUser?.primaryEmailAddress?.emailAddress}</p>
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground uppercase">
                  Role: {localUser?.role || 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
