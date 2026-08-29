/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route beside their component */

import { createFileRoute } from '@tanstack/react-router';
import { requireAuthenticated } from '@/app/routeGuards';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => requireAuthenticated(location),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}
