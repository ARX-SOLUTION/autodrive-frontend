import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';

const LegacyMainDashboard = lazy(() => import('@/pages/DashboardPage'));
const CompanyRevenueDashboard = lazy(
  () => import('@/pages/dashboard/CompanyRevenueDashboard'),
);
const TeacherDashboard = lazy(
  () => import('@/pages/dashboard/TeacherDashboard'),
);

const DashboardRouter = () => {
  const user = useAuthStore((state) => state.user);
  const fallback = <Skeleton className="h-96 w-full rounded-lg" />;

  if (user?.role === 'teacher') {
    return (
      <Suspense fallback={fallback}>
        <TeacherDashboard />
      </Suspense>
    );
  }

  if (user?.company_features?.company_dashboard_v2 === false) {
    return (
      <Suspense fallback={fallback}>
        <LegacyMainDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <CompanyRevenueDashboard />
    </Suspense>
  );
};

export default DashboardRouter;
