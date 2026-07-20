import { ReactNode, useState, useEffect, useRef } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { Redirect, Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Menu, Settings, User, LogOut, Bell, ChevronDown, ShieldCheck } from 'lucide-react';
import { useClerk } from '@clerk/react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Avatar helpers ────────────────────────────────────────────────────────────

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#14b8a6"];
function avatarColor(name: string) {
  if (!name) return PALETTE[0];
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ── useIsMobile ───────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── User menu dropdown ────────────────────────────────────────────────────────

function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const color = avatarColor(name);
  const abbr  = initials(name);

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors text-left ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar */}
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: color }}
        >
          {abbr}
        </span>
        {/* Name — hidden on small screens */}
        <span className="hidden sm:block text-sm font-medium text-foreground max-w-32 truncate">
          {name}
        </span>
        <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-popover border border-border rounded-xl shadow-xl py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User header */}
          <div className="px-3 py-2.5 mb-1 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: color }}
              >
                {abbr}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
                <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-primary font-medium capitalize">
                  <ShieldCheck className="w-3 h-3" />{role}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="px-1.5 space-y-0.5">
            {menuItem(
              <User className="w-4 h-4 text-muted-foreground" />,
              'My Profile',
              () => navigate('/admin/profile'),
            )}
            {menuItem(
              <Settings className="w-4 h-4 text-muted-foreground" />,
              'Settings',
              () => navigate('/admin/settings'),
            )}
          </div>

          <div className="my-1.5 border-t border-border/60 mx-1.5" />

          <div className="px-1.5">
            {menuItem(
              <LogOut className="w-4 h-4" />,
              'Sign out',
              () => signOut({ redirectUrl: basePath || '/' }),
              true,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notification bell (placeholder) ──────────────────────────────────────────

function NotificationBell() {
  // Placeholder — wired up to real notifications in a future iteration
  return (
    <button
      type="button"
      title="Notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
    </button>
  );
}

// ── Top header bar ────────────────────────────────────────────────────────────

function TopBar({
  onMenuClick,
  isMobile,
  name,
  email,
  role,
}: {
  onMenuClick: () => void;
  isMobile: boolean;
  name: string;
  email: string;
  role: string;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center h-14 px-4 bg-background/95 backdrop-blur border-b border-border shrink-0 gap-3">
      {/* Mobile: hamburger + logo */}
      {isMobile && (
        <>
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 mr-auto">
            <img src={`${basePath}/logo.svg`} alt="Logo" className="w-6 h-6" />
            <span className="font-display font-semibold text-sm text-foreground">Training Simulator</span>
          </Link>
        </>
      )}

      {/* Desktop: spacer pushes actions to the right */}
      {!isMobile && <div className="flex-1" />}

      {/* Right side actions */}
      <div className="flex items-center gap-1 ml-auto">
        <NotificationBell />
        <UserMenu name={name} email={email} role={role} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AdminLayout
// ══════════════════════════════════════════════════════════════════════════════

export function AdminLayout({ children }: { children: ReactNode }) {
  const { localUser, isLoading } = useCurrentUser();
  const isMobile = useIsMobile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const { isImpersonating, orgName: impOrgName, role: impRole } = useImpersonation();

  if (!localUser || (!isImpersonating && localUser.role !== 'admin' && localUser.role !== 'developer')) {
    return <Redirect to="/" />;
  }

  const userName  = localUser.name  ?? 'Admin';
  const userEmail = localUser.email ?? '';
  const userRole  = isImpersonating ? (impRole ?? localUser.role ?? 'admin') : (localUser.role ?? 'admin');

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <AdminSidebar
        isOpen={mobileOpen}
        isCollapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed(c => !c)}
        isMobile={isMobile}
      />

      <main className="flex-1 flex flex-col h-[100dvh] overflow-y-auto min-w-0">
        <ImpersonationBanner />
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          isMobile={isMobile}
          name={userName}
          email={userEmail}
          role={userRole}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-4 md:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
