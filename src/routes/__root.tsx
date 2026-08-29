/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route beside their component */

import { Suspense } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { AppRouterContext } from '@/app/router';
import { ChunkErrorBoundary } from '@/components/layout/ChunkErrorBoundary';
import { PageLoader } from '@/components/layout/PageLoader';
import NotFound from '@/pages/NotFound';

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  pendingComponent: PageLoader,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
