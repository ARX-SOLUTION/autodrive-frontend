import { useRestoreSession } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { CircleNotch } from '@phosphor-icons/react';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);
  const { isLoading } = useRestoreSession();
  const { pathname, search } = useLocation();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <CircleNotch className="h-8 w-8 animate-spin" />
          <p className="text-sm">Sessiya tekshirilmoqda...</p>
        </div>
      </div>
    );
  }

  // While restoring session from httpOnly cookie, show a centered loader instead of a blank screen
  if (isAuthenticated && !token && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <CircleNotch className="h-8 w-8 animate-spin" />
          <p className="text-sm">Sessiya tiklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Preserve where the user was so LoginPage can send them back after
  // re-auth (session-expired 401 mid-app should not lose the current page).
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: pathname + search }} replace />;

  if (user?.must_change_password && pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
