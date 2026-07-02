import { User } from '@/types/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isOwner: () => boolean;
  canViewBranches: () => boolean;
  canManageBranches: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true, hasHydrated: true }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          hasHydrated: true,
        }),
      isOwner: () => get().user?.role === 'owner',
      canViewBranches: () => {
        const role = get().user?.role;
        return role === 'owner' || role === 'manager';
      },
      canManageBranches: () => get().user?.role === 'owner',
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'autodrive-auth',
      // Persist the token so the session survives a hard refresh. Deployed
      // cross-site (Vercel FE + Railway BE), the httpOnly cookie is a
      // third-party cookie the browser drops on reload — the Bearer token
      // in localStorage is what keeps the user signed in. Expired tokens are
      // caught by the axios 401 interceptor (logout + redirect to /login).
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasHydrated: state.hasHydrated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
