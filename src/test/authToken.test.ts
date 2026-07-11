import { describe, it, expect, beforeEach } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types/user';

const STORAGE_KEY = 'autodrive-auth';
const user: User = { id: 'u1', email: 'o@x.com', role: 'owner' };

// token is NOT persisted (XSS protection — PR #49); only user/isAuthenticated survive reload
const persistedToken = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').state?.token ?? null;

const persistedUser = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').state?.user ?? null;

describe('auth persisted token clearing', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('real-token', user);
  });

  it('token is never written to localStorage (XSS protection)', () => {
    // setAuth stores in memory only — cookie carries the real session
    expect(persistedToken()).toBeNull();
  });

  it('logout() clears persisted user state', () => {
    expect(persistedUser()).not.toBeNull();
    useAuthStore.getState().logout();
    expect(persistedUser()).toBeNull();
    expect(persistedToken()).toBeNull();
  });

  it('a protected-endpoint 401 triggers logout + cache clear via the interceptor (no hard reload)', async () => {
    // Token is never in localStorage — confirm the invariant holds pre-401 too
    expect(persistedToken()).toBeNull();

    // Seed the shared query cache so we can prove it gets wiped — a hard
    // window.location.href reload used to do this implicitly; the SPA-nav
    // fix (autodrive-6cq.5.9) must clear it explicitly instead.
    queryClient.setQueryData(['tenant-data'], { leaked: true });

    axiosInstance.defaults.adapter = async (config) =>
      Promise.reject({
        config,
        isAxiosError: true,
        response: { status: 401, config },
      });

    await expect(axiosInstance.get('/students')).rejects.toBeTruthy();

    // After 401-triggered logout: user cleared, query cache cleared, and no
    // window.location.href hard reload (ProtectedRoute reacts to the store
    // change with SPA navigation instead).
    expect(persistedToken()).toBeNull();
    expect(persistedUser()).toBeNull();
    expect(queryClient.getQueryData(['tenant-data'])).toBeUndefined();

    delete axiosInstance.defaults.adapter;
  });
});
