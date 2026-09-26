import { User } from '@/types/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isCrossTenantRole } from '@/lib/permissions';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  // Not persisted. Stays false until login or a settled /auth/me, so a stale
  // stored user cannot open the CRM tour before the server flag is known.
  sessionValidated: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setSessionValidated: (value: boolean) => void;
  logout: () => void;
  isOwner: () => boolean;
  isDev: () => boolean;
  isCrossTenant: () => boolean;
  canViewBranches: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      sessionValidated: false,
      setAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
          hasHydrated: true,
          sessionValidated: true,
        }),
      // Revalidate the session (fresh user/role) without touching the
      // persisted token — used by useRestoreSession on every mount.
      setUser: (user) =>
        set({ user, isAuthenticated: true, hasHydrated: true }),
      setSessionValidated: (sessionValidated) => set({ sessionValidated }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          hasHydrated: true,
          sessionValidated: false,
        }),
      isOwner: () => get().user?.role === 'owner',
      isDev: () => get().user?.role === 'dev',
      // owner or dev — the cross-branch roles (single source: permissions.ts)
      isCrossTenant: () => isCrossTenantRole(get().user?.role),
      canViewBranches: () => {
        const role = get().user?.role;
        return role === 'owner' || role === 'manager';
      },
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'autodrive-auth',
      // token is NOT persisted — memory only (XSS can't read httpOnly cookies,
      // but it can read localStorage). The app and API now share the
      // automaktab.uz parent domain (COOKIE_DOMAIN=.automaktab.uz), so the
      // httpOnly cookie is first-party and survives hard refresh;
      // useRestoreSession re-hydrates the user from /auth/me via the cookie.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasHydrated: state.hasHydrated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
