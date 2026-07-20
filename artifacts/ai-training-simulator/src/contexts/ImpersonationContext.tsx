import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ImpersonationState {
  isImpersonating: boolean;
  orgId: number | null;
  orgName: string;
  role: "admin" | "learner" | null;
}

interface ImpersonationContextValue extends ImpersonationState {
  startImpersonation: (orgId: number, orgName: string, role: "admin" | "learner") => void;
  stopImpersonation: () => void;
  switchRole: (role: "admin" | "learner") => void;
}

const STORAGE_KEY = "owner_impersonation";

function loadState(): ImpersonationState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { isImpersonating: false, orgId: null, orgName: "", role: null };
}

function saveState(s: ImpersonationState) {
  if (s.isImpersonating) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(STORAGE_KEY);
}

const ImpersonationContext = createContext<ImpersonationContextValue>({
  isImpersonating: false, orgId: null, orgName: "", role: null,
  startImpersonation: () => {}, stopImpersonation: () => {}, switchRole: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(loadState);
  const [, setLocation] = useLocation();
  const originalFetch = useRef<typeof fetch | null>(null);

  // Intercept window.fetch to inject impersonation headers on all API calls
  useEffect(() => {
    if (!state.isImpersonating || !state.orgId || !state.role) {
      // Restore if we stored the original
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
        originalFetch.current = null;
      }
      return;
    }

    if (!originalFetch.current) originalFetch.current = window.fetch;
    const orig = originalFetch.current;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input
        : input instanceof Request ? input.url
        : input.toString();

      // Only inject on API calls — skip the owner routes themselves
      if (url.includes("/api/") && !url.includes("/api/owner/")) {
        const headers = new Headers((init as RequestInit)?.headers);
        headers.set("x-owner-org", String(state.orgId));
        headers.set("x-owner-role", state.role!);
        return orig.call(this, input, { ...init, headers });
      }
      return orig.call(this, input, init);
    };

    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
        originalFetch.current = null;
      }
    };
  }, [state.isImpersonating, state.orgId, state.role]);

  function startImpersonation(orgId: number, orgName: string, role: "admin" | "learner") {
    const next: ImpersonationState = { isImpersonating: true, orgId, orgName, role };
    saveState(next);
    setState(next);
    // Navigate to the right portal
    if (role === "admin") setLocation("/dashboard");
    else setLocation("/learner/home");
  }

  function stopImpersonation() {
    const next: ImpersonationState = { isImpersonating: false, orgId: null, orgName: "", role: null };
    saveState(next);
    setState(next);
    setLocation("/owner/orgs");
  }

  function switchRole(role: "admin" | "learner") {
    const next = { ...state, role };
    saveState(next);
    setState(next);
    if (role === "admin") setLocation("/dashboard");
    else setLocation("/learner/home");
  }

  return (
    <ImpersonationContext.Provider value={{ ...state, startImpersonation, stopImpersonation, switchRole }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
