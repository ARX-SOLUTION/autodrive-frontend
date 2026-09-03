import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { queryClient } from '@/lib/queryClient';
import { routeTree } from '@/routeTree.gen';

export interface AppRouterContext {
  queryClient: typeof queryClient;
}

export const createAppRouter = (history?: RouterHistory) =>
  createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: false,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 150,
    defaultPendingMinMs: 200,
    scrollRestoration: true,
  });

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
