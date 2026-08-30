import { createFileRoute } from '@tanstack/react-router';
import DashboardRouter from '@/pages/dashboard/DashboardRouter';
import { teacherAnalyticsQueryOptions } from '@/services/dashboardService';
import { useAuthStore } from '@/store/authStore';

export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: ({ context }) => {
    if (useAuthStore.getState().user?.role !== 'teacher') return;
    return context.queryClient.ensureQueryData(teacherAnalyticsQueryOptions());
  },
  component: DashboardRouter,
});
