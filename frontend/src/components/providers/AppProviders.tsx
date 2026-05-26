'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { SessionProvider, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

function AuthErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthExpired = (e: Event) => {
      const msg = (e as CustomEvent).detail || 'Session expired. Please log in again.';
      toast(msg, 'error');
      signOut(); // Automatically redirects to signin or handles it based on NextAuth config
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [toast]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AuthErrorHandler />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
