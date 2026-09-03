import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { AxiosError } from 'axios';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { AuthResponse, User } from '@/types/user';
import { track } from '@/lib/umami';
import { resetAuthSessionState } from '@/lib/queryClient';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { authKeys } from '@/lib/queryKeys';
import type {
  ChangePasswordRequest,
  LoginRequest,
} from '@/shared/api/contract';

const SESSION_RESTORE_FAILURE_STATUSES = new Set([401, 429]);

const getHttpStatus = (error: unknown): number | undefined =>
  (error as AxiosError | undefined)?.response?.status;

const loginApi = async (creds: LoginRequest): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post<unknown>('/auth/login', creds);
  return parseItemEnvelope<AuthResponse>(data, 'auth');
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      queryClient.setQueryData(authKeys.me(), data.user);
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
  const storedUser = useAuthStore((s) => s.user);
  const [restoreFailed, setRestoreFailed] = useState(false);

  const query = useQuery<User>({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>('/auth/me', { signal });
      return parseItemEnvelope<User>(data, 'auth-me');
    },
    initialData: storedUser ?? undefined,
    staleTime: 0,
    enabled: isAuthenticated,
    retry: false,
  });
  const sessionRestoreError = SESSION_RESTORE_FAILURE_STATUSES.has(
    getHttpStatus(query.error) ?? 0,
  );

  useEffect(() => {
    if (sessionRestoreError) {
      setRestoreFailed(true);
      logout();
      resetAuthSessionState(queryClient);
      return;
    }
    if (query.data) {
      setRestoreFailed(false);
      setUser(query.data);
    }
  }, [query.data, sessionRestoreError, setUser, logout, queryClient]);

  return { ...query, restoreFailed };
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (dto: ChangePasswordRequest): Promise<AuthResponse> => {
      const { data } = await axiosInstance.post<unknown>(
        '/auth/change-password',
        dto,
      );
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
    onMutate: () => {
      logout();
      resetAuthSessionState(queryClient);
      void navigate({ to: '/login' });
    },
  });
};
