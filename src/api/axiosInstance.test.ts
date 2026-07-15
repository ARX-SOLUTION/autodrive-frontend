import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axiosInstance from './axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';
import { User } from '@/types/user';

// Regression test for the auth-expiry coordinator (autodrive-6cq.8, AC "D"):
// a 401 on a protected endpoint must trigger logout()+queryClient.clear(),
// while a 401 on /auth/login or /auth/me (SKIP_LOGOUT_ON_401) must NOT --
// see axiosInstance.ts's response interceptor.
const user: User = { id: 'u1', email: 'o@x.com', role: 'owner' };

const reject401 = (url: string) =>
  Promise.reject({
    config: { url },
    isAxiosError: true,
    response: { status: 401 },
  });

describe('axiosInstance 401 interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('token', user);
    queryClient.setQueryData(['tenant-data'], { leaked: true });
  });

  afterEach(() => {
    delete axiosInstance.defaults.adapter;
  });

  it('logs out and clears the query cache on a protected-endpoint 401', async () => {
    axiosInstance.defaults.adapter = async (config) =>
      reject401(config.url ?? '/students');

    await expect(axiosInstance.get('/students')).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(queryClient.getQueryData(['tenant-data'])).toBeUndefined();
  });

  it('does not log out on a /auth/login 401 (bad credentials)', async () => {
    axiosInstance.defaults.adapter = async (config) =>
      reject401(config.url ?? '/auth/login');

    await expect(axiosInstance.post('/auth/login', {})).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(queryClient.getQueryData(['tenant-data'])).toEqual({
      leaked: true,
    });
  });

  it('does not log out on a /auth/me 401 (useRestoreSession handles it itself)', async () => {
    axiosInstance.defaults.adapter = async (config) =>
      reject401(config.url ?? '/auth/me');

    await expect(axiosInstance.get('/auth/me')).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(queryClient.getQueryData(['tenant-data'])).toEqual({
      leaked: true,
    });
  });
});
