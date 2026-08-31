import { redirect } from '@tanstack/react-router';
import { roleCan, type Capability } from '@/lib/permissions';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';
import { useAuthStore } from '@/store/authStore';

type GuardLocation = {
  pathname: string;
  searchStr: string;
};

export function requireAuthenticated(location: GuardLocation): void {
  const auth = useAuthStore.getState();

  // Zustand persist uses synchronous localStorage hydration in the browser,
  // but keep the guard neutral until hydration finishes in restricted modes.
  if (!auth.hasHydrated) return;

  if (!auth.isAuthenticated) {
    throw redirect({
      to: '/login',
      replace: true,
      state: (current) => ({
        ...current,
        from: location.pathname + location.searchStr,
      }),
    });
  }

  if (auth.user?.must_change_password && location.pathname !== '/profile') {
    throw redirect({ to: '/profile', replace: true });
  }
}

export function requireCapability(
  location: GuardLocation,
  capability: Capability,
): void {
  requireAuthenticated(location);
  const auth = useAuthStore.getState();

  if (
    auth.hasHydrated &&
    auth.isAuthenticated &&
    !roleCan(auth.user?.role, capability)
  ) {
    throw redirect({
      to: getDefaultAuthenticatedRoute(auth.user?.role),
      replace: true,
    });
  }
}
