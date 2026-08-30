import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { CircleNotch } from '@phosphor-icons/react';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@/lib/queryClient';
import { initUmami } from '@/lib/umami';
import { ChunkErrorBoundary } from '@/components/layout/ChunkErrorBoundary';
import { useRestoreSession } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { DeferredFeedback } from './DeferredFeedback';

initUmami();

export const SessionBootstrap = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const { isLoading, restoreFailed } = useRestoreSession();

  if (
    !hasHydrated ||
    (isAuthenticated && !token && (isLoading || restoreFailed))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <CircleNotch className="h-8 w-8 animate-spin" />
          <p className="text-sm">Sessiya tiklanmoqda...</p>
        </div>
      </div>
    );
  }

  return children;
};

export const AppProviders = ({ children }: PropsWithChildren) => (
  <ThemeProvider
    attribute="class"
    storageKey="theme"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <ChunkErrorBoundary>
        <SessionBootstrap>
          <DeferredFeedback />
          {children}
        </SessionBootstrap>
      </ChunkErrorBoundary>
    </QueryClientProvider>
  </ThemeProvider>
);
