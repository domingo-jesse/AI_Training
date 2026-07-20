import { useEffect, useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
import { OwnerLayout } from "./OwnerLayout";
import { Building2, Users, BookOpen, ClipboardCheck, AlertCircle, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface Stats {
  orgs: number;
  users: number;
  modules: number;
  attempts: number;
  attemptsToday: number;
  errorsToday: number;
}

interface Activity {
  recentAttempts: any[];
  recentUsers: any[];
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${basePath}/api/owner/stats`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${basePath}/api/owner/activity`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([s, a]) => {
      if (s) setStats(s);
      if (a) setActivity(a);
    }).finally(() => setLoading(false));
  }, []);

  const stateLabel: Record<string, { label: string; color: string }> = {
    in_progress: { label: "In Progress", color: "text-amber-400" },
    submitted:   { label: "Submitted",   color: "text-blue-400" },
    graded:      { label: "Graded",      color: "text-emerald-400" },
  };

  return (
    <OwnerLayout>
      <div className="px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time stats across all organizations</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard icon={Building2}      label="Organizations"   value={stats?.orgs ?? 0}          color="bg-violet-600/20 text-violet-400" />
              <StatCard icon={Users}          label="Total Users"     value={stats?.users ?? 0}         color="bg-blue-600/20 text-blue-400" />
              <StatCard icon={BookOpen}       label="Total Modules"   value={stats?.modules ?? 0}       color="bg-emerald-600/20 text-emerald-400" />
              <StatCard icon={ClipboardCheck} label="Total Attempts"  value={stats?.attempts ?? 0}      color="bg-cyan-600/20 text-cyan-400" />
              <StatCard icon={TrendingUp}     label="Attempts Today"  value={stats?.attemptsToday ?? 0} color="bg-amber-600/20 text-amber-400" sub="last 24 hours" />
              <StatCard icon={AlertCircle}    label="Errors Today"    value={stats?.errorsToday ?? 0}   color={stats?.errorsToday ? "bg-red-600/20 text-red-400" : "bg-gray-600/20 text-gray-400"} sub="last 24 hours" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent submissions */}
              <div className="bg-[#111827] border border-white/8 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-violet-400" />
                  Recent Submissions
                </h2>
                {!activity?.recentAttempts.length ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {activity?.recentAttempts.slice(0, 8).map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-gray-400 shrink-0">
                          {a.user_name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{a.user_name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{a.module_title} · {a.org_name}</p>
                        </div>
                        <span className={`text-[10px] font-medium ${stateLabel[a.attempt_state]?.color ?? "text-gray-400"}`}>
                          {stateLabel[a.attempt_state]?.label ?? a.attempt_state}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent signups */}
              <div className="bg-[#111827] border border-white/8 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  Recent Signups
                </h2>
                {!activity?.recentUsers.length ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No users yet</p>
                ) : (
                  <div className="space-y-3">
                    {activity?.recentUsers.slice(0, 8).map((u: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center text-xs text-violet-300 font-semibold shrink-0">
                          {u.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.role === "admin" ? "bg-violet-600/20 text-violet-400" : "bg-white/5 text-gray-400"}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </OwnerLayout>
  );
}
