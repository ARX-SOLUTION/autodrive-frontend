import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { AuthResponse, LoginCredentials, User } from '@/types/user';

const loginApi = async (creds: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post('/auth/login', creds);
  return data.data;
};

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => setAuth(data.token, data.user),
  });
};

// On every mount of an authenticated app: revalidate the session by
// calling /auth/me. The persisted Bearer token already keeps the user
// signed in across refreshes; this just refreshes user data so role
// changes / revocations take effect (401 → logout below). The token is
// never touched here — we call setUser, not setAuth.
//
// `useQuery` v5 removed the `onSuccess` / `onError` options, so we wire
// the side effects through `useEffect` watching `data` / `error` — the
// old cast-and-pray pattern silently dropped both branches.
export const useRestoreSession = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const query = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/auth/me');
      return data.data;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  useEffect(() => {
    if ((query.error as AxiosError)?.response?.status === 401) logout();
  }, [query.error, logout]);

  return query;
};

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => axiosInstance.post('/auth/logout'),
    onSettled: () => {
      logout();
      queryClient.clear();
      window.location.href = '/login';
    },
  });
};
