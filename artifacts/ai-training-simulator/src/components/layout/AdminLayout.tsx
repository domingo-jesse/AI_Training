import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Redirect } from 'wouter';
import { motion } from 'framer-motion';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { localUser, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!localUser || (localUser.role !== 'admin' && localUser.role !== 'developer')) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <AdminSidebar />
      <main className="flex-1 flex flex-col h-[100dvh] overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
