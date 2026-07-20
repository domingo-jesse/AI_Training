import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Shield, X, RefreshCw } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, orgName, role, stopImpersonation, switchRole } = useImpersonation();

  if (!isImpersonating) return null;

  const otherRole = role === "admin" ? "learner" : "admin";

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-violet-700 text-white text-sm shadow-lg">
      <Shield className="w-4 h-4 shrink-0 opacity-80" />
      <span className="font-medium">Owner Preview</span>
      <span className="opacity-60">—</span>
      <span>
        Viewing <strong>{orgName}</strong> as{" "}
        <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-semibold uppercase tracking-wide">
          {role}
        </span>
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => switchRole(otherRole as "admin" | "learner")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Switch to {otherRole}
        </button>
        <button
          onClick={stopImpersonation}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-xs font-medium transition-colors"
        >
          <X className="w-3 h-3" />
          Exit Preview
        </button>
      </div>
    </div>
  );
}
