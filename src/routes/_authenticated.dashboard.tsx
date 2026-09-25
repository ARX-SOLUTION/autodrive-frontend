import { createFileRoute } from '@tanstack/react-router';
import DashboardRouter from '@/pages/dashboard/DashboardRouter';
import { useAuthStore } from '@/store/authStore';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/dashboard']),
  loader: async ({ context }) => {
    if (useAuthStore.getState().user?.role !== 'teacher') return;
    const { teacherAnalyticsQueryOptions } =
      await import('@/services/dashboardService');
    return context.queryClient.ensureQueryData(teacherAnalyticsQueryOptions());
  },
  component: DashboardRouter,
});
