import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { AuthResponse, LoginCredentials, User } from '@/types/user';
import { track } from '@/lib/umami';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { authKeys } from '@/lib/queryKeys';

const loginApi = async (creds: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post('/auth/login', creds);
  return parseItemEnvelope<AuthResponse>(data, 'auth');
};

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      track('login_success', { role: data.user.role });
    },
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
  const queryClient = useQueryClient();

  const query = useQuery<User>({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get('/auth/me', { signal });
      return parseItemEnvelope<User>(data, 'auth-me');
    },
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
      return;
    }
    if ((query.error as AxiosError)?.response?.status === 401) {
      logout();
      queryClient.clear();
    }
  }, [query.data, query.error, setUser, logout, queryClient]);

  return query;
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (dto: {
      currentPassword: string;
      newPassword: string;
    }): Promise<AuthResponse> => {
      const { data } = await axiosInstance.post('/auth/change-password', dto);
      return parseItemEnvelope<AuthResponse>(data, 'auth');
    },
    onSuccess: (data) => {
      // The backend bumps tokenVersion (kills old sessions) and returns a
      // fresh token — adopt it so THIS session survives the change; without
      // it the next request 401s and the user is dumped back to /login.
      if (data?.token && data?.user) setAuth(data.token, data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => axiosInstance.post('/auth/logout'),
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
};
