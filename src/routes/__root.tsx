/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route beside their component */

import { lazy, Suspense } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { AppRouterContext } from '@/app/router';
import { ChunkErrorBoundary } from '@/components/layout/ChunkErrorBoundary';
import { PageLoader } from '@/components/layout/PageLoader';

const NotFoundPage = lazy(() => import('@/pages/NotFound'));

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  pendingComponent: PageLoader,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NotFoundPage />
    </Suspense>
  );
}

function RootComponent() {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
