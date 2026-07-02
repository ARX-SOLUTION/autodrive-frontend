import { describe, it, expect, beforeEach } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types/user';

const STORAGE_KEY = 'autodrive-auth';
const user: User = { id: 'u1', email: 'o@x.com', role: 'owner' };

const persistedToken = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').state?.token ?? null;

describe('auth persisted token clearing', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('real-token', user);
  });

  it('logout() nulls the persisted token', () => {
    expect(persistedToken()).toBe('real-token');
    useAuthStore.getState().logout();
    expect(persistedToken()).toBeNull();
  });

  it('a protected-endpoint 401 nulls the persisted token via the interceptor', async () => {
    // Interceptor sets window.location.href on logout; stub navigation.
    const original = window.location;
    // @ts-expect-error jsdom navigation is not implemented
    delete window.location;
    window.location = { href: '' } as Location;

    expect(persistedToken()).toBe('real-token');

    axiosInstance.defaults.adapter = async (config) =>
      Promise.reject({ config, isAxiosError: true, response: { status: 401, config } });

    await expect(axiosInstance.get('/students')).rejects.toBeTruthy();
    expect(persistedToken()).toBeNull();

    window.location = original;
    delete axiosInstance.defaults.adapter;
  });
});
