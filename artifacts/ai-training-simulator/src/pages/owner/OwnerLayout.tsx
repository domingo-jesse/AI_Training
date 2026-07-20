import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
import {
  LayoutDashboard, Building2, ScrollText, ChevronRight,
  Shield, LogOut, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/owner", label: "Dashboard",      icon: LayoutDashboard },
  { href: "/owner/orgs", label: "Organizations", icon: Building2 },
  { href: "/owner/logs", label: "Activity & Logs", icon: ScrollText },
];

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${basePath}/api/owner/check`, { credentials: "include" })
      .then(r => setAllowed(r.ok))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0f1a]">
        <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0b0f1a] text-white gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-gray-400">You don't have platform owner access.</p>
        <Link href="/dashboard" className="text-sm text-violet-400 underline">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0b0f1a] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-white/8 bg-[#0d1120]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Owner Portal</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Platform Control</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/owner" ? location === "/owner" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-violet-600/20 text-violet-300 font-medium"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold">
              {user?.firstName?.[0] ?? "O"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.fullName ?? "Owner"}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <LogOut className="w-3 h-3" />
            Back to app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
