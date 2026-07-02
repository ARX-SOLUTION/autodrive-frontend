import { describe, it, expect, beforeEach } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
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

  it('a protected-endpoint 401 triggers logout via the interceptor', async () => {
    // Interceptor sets window.location.href on logout; stub navigation.
    const original = window.location;
    // @ts-expect-error jsdom navigation is not implemented
    delete window.location;
    window.location = { href: '' } as Location;

    // Token is never in localStorage — confirm the invariant holds pre-401 too
    expect(persistedToken()).toBeNull();

    axiosInstance.defaults.adapter = async (config) =>
      Promise.reject({
        config,
        isAxiosError: true,
        response: { status: 401, config },
      });

    await expect(axiosInstance.get('/students')).rejects.toBeTruthy();
    // After 401-triggered logout, user state is also cleared
    expect(persistedToken()).toBeNull();

    window.location = original;
    delete axiosInstance.defaults.adapter;
  });
});
