import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { preconnectApi } from '@/lib/preconnectApi';
import type {
  ChangePasswordRequest,
  LoginRequest,
} from '@/shared/api/contract';
import type { AuthResponse, User } from '@/types/user';

preconnectApi();

export const loginRequest = async (
  creds: LoginRequest,
): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post<unknown>('/auth/login', creds);
  return parseItemEnvelope<AuthResponse>(data, 'auth');
};

export const fetchCurrentUser = async (signal?: AbortSignal): Promise<User> => {
  const { data } = await axiosInstance.get<unknown>('/auth/me', { signal });
  return parseItemEnvelope<User>(data, 'auth-me');
};

export const changePasswordRequest = async (
  dto: ChangePasswordRequest,
): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post<unknown>(
    '/auth/change-password',
    dto,
  );
  return parseItemEnvelope<AuthResponse>(data, 'auth');
};

export const logoutRequest = () => axiosInstance.post('/auth/logout');
