import { Link, useLocation } from 'wouter';
import { Users, FileText, CheckSquare, BarChart, Settings, User, LayoutDashboard, Layers, BookOpen, UserPlus, Database, Terminal, Beaker, ChevronLeft, ChevronRight, X, Tag, Shield } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUser } from '@clerk/react';

const PLATFORM_OWNER_EMAILS = ['domingo.jesse@gmail.com'];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navItems = [
  { name: 'Dashboard',          path: '/dashboard',            icon: LayoutDashboard },
  { name: 'Manage Modules',     path: '/admin/modules',        icon: BookOpen },
  { name: 'Module Builder',     path: '/admin/module-builder', icon: Layers },
  { name: 'Assign Modules',     path: '/admin/assign-modules', icon: UserPlus },
  { name: 'Assignments',        path: '/admin/assignments',    icon: CheckSquare },
  { name: 'Grading Center',     path: '/admin/grading',        icon: FileText },
  { name: 'Progress Tracking',  path: '/admin/progress',       icon: BarChart },
  { name: 'Account Management', path: '/admin/accounts',       icon: Users },
  { name: 'Groups',             path: '/admin/groups',         icon: Tag },
  { name: 'Profile',            path: '/admin/profile',        icon: User },
  { name: 'Settings',           path: '/admin/settings',       icon: Settings },
];

const devItems = [
  { name: 'Database Tables', path: '/admin/db-tables',  icon: Database },
  { name: 'Debug Logs',      path: '/admin/debug-logs', icon: Terminal },
  { name: 'QA Test Center',  path: '/admin/qa-center',  icon: Beaker },
];

interface AdminSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  isMobile: boolean;
}

export function AdminSidebar({ isOpen, isCollapsed, onClose, onToggleCollapse, isMobile }: AdminSidebarProps) {
  const [location] = useLocation();
  const { localUser } = useCurrentUser();
  const { user: clerkUser } = useUser();
  const isDeveloper = localUser?.role === 'developer';
  const isPlatformOwner = PLATFORM_OWNER_EMAILS.includes(
    clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? ''
  );

  const collapsed = !isMobile && isCollapsed;

  const navLink = (item: typeof navItems[0]) => {
    const isActive = location === item.path || location.startsWith(`${item.path}/`);
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={isMobile ? onClose : undefined}
        title={collapsed ? item.name : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        }`}
      >
        <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <aside
      className={`bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className={`h-16 flex items-center border-b border-sidebar-border shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
            <img src={`${basePath}/logo.svg`} alt="Logo" className="w-8 h-8 shrink-0" />
            <span className="font-display font-semibold text-base tracking-tight text-sidebar-foreground truncate">
              Training Simulator Admin
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard">
            <img src={`${basePath}/logo.svg`} alt="Logo" className="w-8 h-8" />
          </Link>
        )}
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0 ${collapsed ? '' : 'ml-auto'}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-5 px-2 space-y-0.5">
        {!collapsed && (
          <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-2">
            Management
          </div>
        )}
        {navItems.map(navLink)}

        {isDeveloper && (
          <>
            {!collapsed && (
              <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mt-6 mb-3 px-2">
                Developer Tools
              </div>
            )}
            {collapsed && <div className="my-2 border-t border-sidebar-border" />}
            {devItems.map(navLink)}
          </>
        )}

        {isPlatformOwner && (
          <>
            {collapsed && <div className="my-2 border-t border-sidebar-border" />}
            {!collapsed && (
              <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mt-6 mb-3 px-2">
                Platform
              </div>
            )}
            <Link
              href="/owner"
              onClick={isMobile ? onClose : undefined}
              title={collapsed ? 'Owner Portal' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                location.startsWith('/owner')
                  ? 'bg-violet-600/20 text-violet-300 font-medium'
                  : 'text-violet-400/70 hover:text-violet-300 hover:bg-violet-600/10'
              }`}
            >
              <Shield className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">Owner Portal</span>}
            </Link>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`p-3 border-t border-sidebar-border shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm"
            title={localUser?.name || 'Admin'}
          >
            {localUser?.name?.charAt(0) || 'A'}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
              {localUser?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{localUser?.name || 'Admin'}</span>
              <span className="text-xs text-sidebar-foreground/50 capitalize">{localUser?.role || 'Admin'}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
        {/* Slide-in drawer */}
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
