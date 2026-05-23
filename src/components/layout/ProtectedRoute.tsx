import { useRestoreSession } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token, hasHydrated } = useAuthStore();
  const { isLoading } = useRestoreSession();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
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
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Sessiya tiklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
