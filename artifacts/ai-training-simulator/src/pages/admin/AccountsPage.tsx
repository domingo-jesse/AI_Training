import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, RefreshCw, AlertCircle } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface OrgMember {
  membershipId: string;
  userId: number;
  name: string;
  email: string | null;
  role: "owner" | "admin" | "manager" | "learner";
  status: "active" | "inactive" | "invited";
  joinedAt: string;
  isActive: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  owner:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  manager: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  learner: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-red-500/20 text-red-400 border-red-500/30",
  invited:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function useOrgMembers(orgId: number | undefined) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrgId, setLastOrgId] = useState<number | undefined>();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const load = (id: number) => {
    setIsLoading(true);
    setError(null);
    fetch(`${basePath}/api/organizations/${id}/members`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load members (${r.status})`);
        return r.json() as Promise<OrgMember[]>;
      })
      .then((data) => { setMembers(data); setLastOrgId(id); })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  };

  // Auto-load when orgId changes
  if (orgId !== undefined && orgId !== lastOrgId && !isLoading) {
    load(orgId);
  }

  return { members, isLoading, error, reload: () => orgId && load(orgId) };
}

export default function AccountsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const { members, isLoading, error, reload } = useOrgMembers(currentOrg?.organizationId);

  const canManage = currentOrg && ["owner", "admin", "manager"].includes(currentOrg.role);

  if (orgLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!currentOrg) {
    return (
      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Account Management</h1>
          <p className="text-muted-foreground mt-1">Manage users, teams, roles, and permissions.</p>
        </div>
        <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Organization Found</h2>
          <p className="text-muted-foreground">You are not a member of any organization yet.</p>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Account Management</h1>
          <p className="text-muted-foreground mt-1">
            {currentOrg.organizationName} · {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" disabled>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && members.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-24 text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Members Yet</h2>
          <p className="text-muted-foreground max-w-md">
            This organization has no members. Invite someone to get started.
          </p>
        </Card>
      )}

      {!isLoading && members.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.membershipId} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {getInitials(member.name)}
                  </div>

                  {/* Name + Email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email ?? "—"}</p>
                  </div>

                  {/* Role */}
                  <Badge variant="outline" className={`text-xs capitalize ${ROLE_COLORS[member.role] ?? ""}`}>
                    {member.role}
                  </Badge>

                  {/* Status */}
                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[member.status] ?? ""}`}>
                    {member.status}
                  </Badge>

                  {/* Joined date */}
                  <p className="text-xs text-muted-foreground w-24 text-right shrink-0">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
