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
      // token is NOT persisted — it lives in memory only.
      // Session is maintained via httpOnly cookie; Bearer is kept for
      // in-session requests where the in-memory token is still available.
      partialize: (state) => ({
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
