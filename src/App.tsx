import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/layout/PageLoader';
import { useAuthStore } from '@/store/authStore';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingPrototype = lazy(() => import('./pages/LandingPrototype'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const OperatorsPage = lazy(() => import('./pages/OperatorsPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LandingPage = lazy(() => import('./pages/LandingPage'));

const OwnerRoute = ({ children }: { children: React.ReactNode }) => {
  const isOwner = useAuthStore((s) => s.isOwner);
  if (!isOwner()) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const BranchAccessRoute = ({ children }: { children: React.ReactNode }) => {
  const canViewBranches = useAuthStore((s) => s.canViewBranches);
  if (!canViewBranches()) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/prototype/landing" element={<LandingPrototype />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route
                path="branches"
                element={
                  <BranchAccessRoute>
                    <BranchesPage />
                  </BranchAccessRoute>
                }
              />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route
                path="operators"
                element={
                  <BranchAccessRoute>
                    <OperatorsPage />
                  </BranchAccessRoute>
                }
              />
              <Route
                path="teachers"
                element={
                  <BranchAccessRoute>
                    <TeachersPage />
                  </BranchAccessRoute>
                }
              />
              <Route
                path="users"
                element={
                  <OwnerRoute>
                    <UsersPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <OwnerRoute>
                    <AuditLogPage />
                  </OwnerRoute>
                }
              />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
