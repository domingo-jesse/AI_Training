import { Link, useLocation } from 'wouter';
import { BookOpen, CheckSquare, Settings, User, LayoutDashboard, BarChart, Database, Terminal, Menu, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#14b8a6"];
function avatarColor(name: string) {
  if (!name) return PALETTE[0];
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const navItems = [
  { name: 'Home',              path: '/learner/home',     icon: LayoutDashboard },
  { name: 'My Modules',        path: '/learner/modules',  icon: BookOpen },
  { name: 'Module Workspace',  path: '/learner/workspace',icon: CheckSquare },
  { name: 'Progress & Results',path: '/learner/progress', icon: BarChart },
];

const accountItems = [
  { name: 'Profile', path: '/learner/profile',  icon: User },
  { name: 'Settings',path: '/learner/settings', icon: Settings },
];

const devItems = [
  { name: 'Database Tables', path: '/admin/db-tables',  icon: Database },
  { name: 'Debug Logs',      path: '/admin/debug-logs', icon: Terminal },
];

interface LearnerSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export function LearnerSidebar({ isOpen, isMobile, onClose }: LearnerSidebarProps) {
  const [location] = useLocation();
  const { localUser } = useCurrentUser();
  const isDeveloper = localUser?.role === 'developer';

  const color = avatarColor(localUser?.name ?? '');
  const abbr  = initials(localUser?.name ?? '');

  const navLink = (item: { name: string; path: string; icon: any }) => {
    const isActive = location === item.path || location.startsWith(`${item.path}/`);
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={isMobile ? onClose : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        }`}
      >
        <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        <span>{item.name}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-3 shrink-0">
        <Link href="/learner/home" className="flex items-center gap-3 flex-1 min-w-0">
          <img src={`${basePath}/logo.svg`} alt="Logo" className="w-8 h-8 shrink-0" />
          <span className="font-display font-semibold text-base tracking-tight text-sidebar-foreground truncate">
            Training Simulator
          </span>
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-5 px-2 space-y-0.5">
        <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-2">
          Learning Portal
        </div>
        {navItems.map(navLink)}

        <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mt-6 mb-3 px-2">
          Account
        </div>
        {accountItems.map(navLink)}

        {isDeveloper && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mt-4 mb-3 px-2">
              Developer Tools
            </div>
            {devItems.map(navLink)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: color }}
          >
            {abbr}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{localUser?.name || 'Learner'}</span>
            <span className="text-xs text-sidebar-foreground/50 capitalize">{localUser?.role || 'learner'}</span>
          </div>
        </div>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
        <div
          className={`fixed top-0 left-0 z-50 h-full transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}
