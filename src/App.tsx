import { lazy, Suspense } from 'react';
import { initUmami } from '@/lib/umami';

initUmami(); // ponytail: module-load — runs once, no-op if env vars absent
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/layout/PageLoader';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { queryClient } from '@/lib/queryClient';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const OperatorsPage = lazy(() => import('./pages/OperatorsPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const BranchDetailPage = lazy(() => import('./pages/BranchDetailPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const AuditDetailPage = lazy(() => import('./pages/AuditDetailPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const LandingPage = lazy(() => import('./pages/LandingPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));

const OwnerRoute = ({ children }: { children: React.ReactNode }) => {
  // owner + dev (dev is a strict superset of owner) — company-wide admin routes
  const isCrossTenant = useIsCrossTenant();
  if (!isCrossTenant) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const BranchAccessRoute = ({ children }: { children: React.ReactNode }) => {
  // owner + manager (+ dev) — management-level access to branch/staff sections
  const canManageStaff = useCan('manageStaff');
  if (!canManageStaff) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <OfflineBanner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
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
                  <OwnerRoute>
                    <BranchesPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="branches/:id"
                element={
                  <OwnerRoute>
                    <BranchDetailPage />
                  </OwnerRoute>
                }
              />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:id" element={<GroupDetailPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
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
                path="users/:id"
                element={
                  <BranchAccessRoute>
                    <UserDetailPage />
                  </BranchAccessRoute>
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
              <Route
                path="audit/:id"
                element={
                  <OwnerRoute>
                    <AuditDetailPage />
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
