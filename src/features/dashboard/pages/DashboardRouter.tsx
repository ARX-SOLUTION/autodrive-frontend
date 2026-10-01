import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';
import { useAuthStore } from '@/store/authStore';

const LegacyMainDashboard = lazy(
  () => import('@/features/dashboard/pages/DashboardPage'),
);
const CompanyRevenueDashboard = lazy(
  () => import('@/features/dashboard/components/CompanyRevenueDashboard'),
);
const TeacherDashboard = lazy(
  () => import('@/features/dashboard/components/TeacherDashboard'),
);
const FinanceDashboard = lazy(
  () => import('@/features/dashboard/components/FinanceDashboard'),
);

const DashboardRouter = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const defaultRoute = getDefaultAuthenticatedRoute(user);
  const canViewDashboard = defaultRoute === '/dashboard';
  const fallback = <Skeleton className="h-96 w-full rounded-lg" />;

  useEffect(() => {
    if (canViewDashboard) return;
    void navigate({ to: defaultRoute, replace: true });
  }, [canViewDashboard, defaultRoute, navigate]);

  if (!canViewDashboard) return null;

  if (user?.role === 'teacher') {
    return (
      <Suspense fallback={fallback}>
        <TeacherDashboard />
      </Suspense>
    );
  }

  if (user?.role === 'accountant') {
    return (
      <Suspense fallback={fallback}>
        <FinanceDashboard />
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
