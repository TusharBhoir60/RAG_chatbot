'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
