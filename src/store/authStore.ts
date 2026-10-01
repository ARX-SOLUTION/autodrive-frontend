import { User } from '@/features/staff/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isCrossTenantRole } from '@/lib/permissions';
import { resetAuthSessionState } from '@/lib/queryClient';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  // Not persisted. Stays false until login or a settled /auth/me, so a stale
  // stored user cannot open the CRM tour before the server flag is known.
  sessionValidated: boolean;
  activeBranchId: string | null;
  setActiveBranch: (branchId: string | null) => void;
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
      activeBranchId: null,
      setActiveBranch: (branchId) => {
        const user = get().user;
        if (
          branchId &&
          user?.role !== 'owner' &&
          user?.role !== 'dev' &&
          !(user?.branch_ids ?? [user?.branch_id]).includes(branchId)
        )
          return;
        if (branchId === get().activeBranchId) return;
        resetAuthSessionState(undefined, { keepAuthMe: true });
        set({ activeBranchId: branchId });
      },
      setAuth: (token, user) => {
        resetAuthSessionState();
        set({
          token,
          user,
          isAuthenticated: true,
          hasHydrated: true,
          sessionValidated: true,
          activeBranchId:
            user.role === 'owner' || user.role === 'dev'
              ? null
              : (user.branch_ids?.[0] ?? user.branch_id ?? null),
        });
      },
      // Revalidate the session (fresh user/role) without touching the
      // persisted token — used by useRestoreSession on every mount.
      setUser: (user) => {
        const previous = get().user;
        if (
          previous &&
          (previous.id !== user.id ||
            previous.company_id !== user.company_id ||
            previous.access_version !== user.access_version ||
            previous.role !== user.role)
        ) {
          resetAuthSessionState(undefined, { keepAuthMe: true });
        }
        const current = get().activeBranchId;
        const ordinary = user.role !== 'owner' && user.role !== 'dev';
        const initialBranch = !get().sessionValidated && !current && ordinary;
        const activeBranchId = initialBranch
          ? (user.branch_ids?.[0] ?? user.branch_id ?? null)
          : current &&
              user.branch_ids &&
              !user.branch_ids.includes(current) &&
              user.role !== 'owner' &&
              user.role !== 'dev'
            ? (user.branch_ids[0] ?? null)
            : current;
        set({ user, activeBranchId, isAuthenticated: true, hasHydrated: true });
      },
      setSessionValidated: (sessionValidated) => set({ sessionValidated }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          hasHydrated: true,
          sessionValidated: false,
          activeBranchId: null,
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
