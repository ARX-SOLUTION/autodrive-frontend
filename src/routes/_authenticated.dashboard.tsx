import { createFileRoute } from '@tanstack/react-router';
import DashboardRouter from '@/features/dashboard/pages/DashboardRouter';
import { useAuthStore } from '@/store/authStore';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/dashboard']),
  loader: ({ context }) => {
    const user = useAuthStore.getState().user;
    if (user?.role === 'teacher') {
      return import('@/features/dashboard/api/dashboardService').then(
        ({ teacherAnalyticsQueryOptions }) =>
          context.queryClient.ensureQueryData(teacherAnalyticsQueryOptions()),
      );
    }

    // Do not block navigation on the large overview payload. DashboardRouter
    // renders the heading and filters immediately while this warms the cache.
    if (user?.company_features?.company_dashboard_v2 !== false) {
      void import('@/features/dashboard/api/dashboardService').then(
        ({ companyOverviewQueryOptions }) =>
          context.queryClient.prefetchQuery(
            companyOverviewQueryOptions({
              branchId: user?.branch_id ?? undefined,
              granularity: 'day',
            }),
          ),
      );
    }
  },
  component: DashboardRouter,
});
