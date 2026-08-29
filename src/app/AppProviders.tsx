import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@/lib/queryClient';
import { initUmami } from '@/lib/umami';
import { DeferredFeedback } from './DeferredFeedback';

initUmami();

export const AppProviders = ({ children }: PropsWithChildren) => (
  <ThemeProvider
    attribute="class"
    storageKey="theme"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <DeferredFeedback />
      {children}
    </QueryClientProvider>
  </ThemeProvider>
);
