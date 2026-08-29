import { createFileRoute } from '@tanstack/react-router';
import DashboardPage from '@/pages/DashboardPage';
import { teacherAnalyticsQueryOptions } from '@/services/dashboardService';
import { useAuthStore } from '@/store/authStore';

export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: ({ context }) => {
    if (useAuthStore.getState().user?.role !== 'teacher') return;
    return context.queryClient.ensureQueryData(teacherAnalyticsQueryOptions());
  },
  component: DashboardPage,
});
