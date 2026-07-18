import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  const [allOrgs, setAllOrgs] = useState<OrgMembership[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgMembership | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localUser) return;

    setIsLoading(true);
    fetch(`${basePath}/api/organizations`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load organizations (${r.status})`);
        return r.json() as Promise<OrgMembership[]>;
      })
      .then((orgs) => {
        setAllOrgs(orgs);

        // Auto-select: previously selected, or first active org
        const savedId = sessionStorage.getItem("currentOrgId");
        const saved = savedId ? orgs.find((o) => o.organizationId === Number(savedId)) : null;
        setCurrentOrg(saved ?? orgs[0] ?? null);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [localUser]);

  function switchOrg(orgId: number) {
    const org = allOrgs.find((o) => o.organizationId === orgId);
    if (org) {
      setCurrentOrg(org);
      sessionStorage.setItem("currentOrgId", String(orgId));
    }
  }

  return (
    <OrganizationContext.Provider value={{ currentOrg, allOrgs, isLoading: userLoading || isLoading, error, switchOrg }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
