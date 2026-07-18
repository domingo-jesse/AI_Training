import { Link, useLocation } from 'wouter';
import { BookOpen, CheckSquare, Settings, User, LayoutDashboard, BarChart } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navItems = [
  { name: 'Home', path: '/learner/home', icon: LayoutDashboard },
  { name: 'My Modules', path: '/learner/modules', icon: BookOpen },
  { name: 'Module Workspace', path: '/learner/workspace', icon: CheckSquare },
  { name: 'Progress & Results', path: '/learner/progress', icon: BarChart },
  { name: 'Profile', path: '/learner/profile', icon: User },
  { name: 'Settings', path: '/learner/settings', icon: Settings },
];

export function LearnerSidebar() {
  const [location] = useLocation();
  const { localUser } = useCurrentUser();
  
  const isDeveloper = localUser?.role === 'developer';

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link href="/learner/home" className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="Training Simulator Logo" className="w-8 h-8" />
          <span className="font-display font-semibold text-lg tracking-tight text-sidebar-foreground">Training Simulator</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">Learning Portal</div>
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(`${item.path}/`);
          return (
            <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {isDeveloper && (
          <>
            <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mt-8 mb-4 px-2">Developer Tools</div>
            <Link href="/admin/db-tables" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${location === '/admin/db-tables' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
              <Settings className="w-5 h-5" />
              <span>Database Tables</span>
            </Link>
            <Link href="/admin/debug-logs" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${location === '/admin/debug-logs' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
              <Settings className="w-5 h-5" />
              <span>Debug Logs</span>
            </Link>
          </>
        )}
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
            {localUser?.name?.charAt(0) || 'L'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground line-clamp-1">{localUser?.name || 'Learner'}</span>
            <span className="text-xs text-sidebar-foreground/50 capitalize">{localUser?.role || 'Learner'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
