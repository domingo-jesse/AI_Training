import { ReactNode, useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Redirect } from 'wouter';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { localUser, isLoading } = useCurrentUser();
  const isMobile = useIsMobile();

  const [mobileOpen, setMobileOpen]     = useState(false);
  const [collapsed,  setCollapsed]      = useState(false);

  // Close mobile sidebar on resize to desktop
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

  if (!localUser || (localUser.role !== 'admin' && localUser.role !== 'developer')) {
    return <Redirect to="/" />;
  }

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
        {/* Mobile top bar */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-background/95 backdrop-blur border-b border-border shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src={`${basePath}/logo.svg`} alt="Logo" className="w-6 h-6" />
              <span className="font-display font-semibold text-sm text-foreground">Training Simulator</span>
            </div>
          </div>
        )}

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
