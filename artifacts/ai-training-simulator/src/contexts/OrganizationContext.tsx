import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export interface OrgMembership {
  membershipId: string;
  organizationId: number;
  organizationName: string;
  role: "owner" | "admin" | "manager" | "learner";
  status: "active" | "inactive" | "invited";
  createdAt: string;
}

interface OrganizationContextValue {
  currentOrg: OrgMembership | null;
  allOrgs: OrgMembership[];
  isLoading: boolean;
  error: string | null;
  switchOrg: (orgId: number) => void;
}

const OrganizationContext = createContext<OrganizationContextValue>({
  currentOrg: null,
  allOrgs: [],
  isLoading: false,
  error: null,
  switchOrg: () => {},
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { localUser, isLoading: userLoading } = useCurrentUser();
  const { isImpersonating, orgId: impOrgId, orgName: impOrgName, role: impRole } = useImpersonation();
  const [allOrgs, setAllOrgs] = useState<OrgMembership[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgMembership | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When impersonating, return a synthetic org — skip the real fetch
    if (isImpersonating && impOrgId && impOrgName && impRole) {
      const synthetic: OrgMembership = {
        membershipId: "impersonated",
        organizationId: impOrgId,
        organizationName: impOrgName,
        role: impRole as OrgMembership["role"],
        status: "active",
        createdAt: new Date().toISOString(),
      };
      setAllOrgs([synthetic]);
      setCurrentOrg(synthetic);
      return;
    }

    if (!localUser) return;

    setIsLoading(true);
    fetch(`${basePath}/api/organizations`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load organizations (${r.status})`);
        return r.json() as Promise<OrgMembership[]>;
      })
      .then((orgs) => {
        setAllOrgs(orgs);
        const savedId = sessionStorage.getItem("currentOrgId");
        const saved = savedId ? orgs.find((o) => o.organizationId === Number(savedId)) : null;
        setCurrentOrg(saved ?? orgs[0] ?? null);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [localUser, isImpersonating, impOrgId, impOrgName, impRole]);

  const switchOrg = useCallback((orgId: number) => {
    setAllOrgs(prev => {
      const org = prev.find((o) => o.organizationId === orgId);
      if (org) {
        setCurrentOrg(org);
        sessionStorage.setItem("currentOrgId", String(orgId));
      }
      return prev;
    });
  }, []);

  // Memoize the context value to prevent re-renders on unrelated parent updates
  const value = useMemo<OrganizationContextValue>(() => ({
    currentOrg,
    allOrgs,
    isLoading: userLoading || isLoading,
    error,
    switchOrg,
  }), [currentOrg, allOrgs, userLoading, isLoading, error, switchOrg]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
