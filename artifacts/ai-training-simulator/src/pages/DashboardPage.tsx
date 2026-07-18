import { useCurrentUser } from "@/hooks/useCurrentUser";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { ApiStatusBadge } from "@/components/shared/ApiStatusBadge";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileText, CheckSquare, BarChart, Users, Layers, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";

const dashboardCards = [
  { title: "Assignment Management", desc: "Assign modules to users and track deadlines", icon: FileText, href: "/admin/assignments", color: "text-blue-500", bg: "bg-blue-500/10" },
  { title: "Grading Center", desc: "Review submissions and provide feedback", icon: CheckSquare, href: "/admin/grading", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { title: "Progress Tracking", desc: "Analytics on module completion rates", icon: BarChart, href: "/admin/progress", color: "text-purple-500", bg: "bg-purple-500/10" },
  { title: "Account Management", desc: "Manage roles, teams, and user access", icon: Users, href: "/admin/accounts", color: "text-amber-500", bg: "bg-amber-500/10" },
  { title: "Module Builder", desc: "Create new interactive training modules", icon: Layers, href: "/admin/module-builder", color: "text-pink-500", bg: "bg-pink-500/10" },
];

export default function DashboardPage() {
  const { localUser } = useCurrentUser();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Welcome back, {localUser?.name?.split(' ')[0] || 'Admin'}</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening in your workspace today.</p>
        </div>
        <div className="flex items-center gap-4">
          <ApiStatusBadge />
          {localUser && <RoleBadge role={localUser.role} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link href={card.href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg} ${card.color}`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">{card.title}</CardTitle>
                  <CardDescription>{card.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
                    Go to section <ArrowRight className="ml-1 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
        <Card>
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p>No recent activity in your workspace yet.</p>
            <p className="text-sm">When users complete modules or submit assignments, they will appear here.</p>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
