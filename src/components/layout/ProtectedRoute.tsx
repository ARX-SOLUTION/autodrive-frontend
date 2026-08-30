import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { CircleNotch } from '@phosphor-icons/react';
import { useLocation, useRouter } from '@tanstack/react-router';

const SpinGate = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <CircleNotch className="h-8 w-8 animate-spin" />
      <p className="text-sm">Sessiya tekshirilmoqda...</p>
    </div>
  </div>
);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const router = useRouter();

  // Route guards read the store outside React. Re-run them whenever restored
  // identity or authorization changes so a revoked role cannot retain a page.
  useEffect(() => {
    void router.invalidate();
  }, [
    router,
    hasHydrated,
    isAuthenticated,
    user?.role,
    user?.must_change_password,
  ]);

  if (!hasHydrated) {
    return <SpinGate />;
  }

  // Unauthenticated (or a forced password-change) target: render a neutral
  // gate instead of a <Navigate> element. <Navigate> re-navigates on every
  // render because its props identity changes while this component subscribes
  // to the router store — that drove the infinite load/redirect loop that
  // hung the app on logout/session-expiry. We render the gate and let the
  // `router.invalidate()` effect below re-run the route guard
  // (`requireAuthenticated`), which throws the correct redirect, preserving
  // the `from` path for LoginPage.
  if (
    !isAuthenticated ||
    (user?.must_change_password && pathname !== '/profile')
  ) {
    return <SpinGate />;
  }

  return <>{children}</>;
};
