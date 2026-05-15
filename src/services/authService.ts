import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/api/axiosInstance";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse, LoginCredentials, User } from "@/types/user";

const loginApi = async (creds: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post("/auth/login", creds);
  return data.data;
};

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => setAuth(data.token, data.user),
  });
};

// On page refresh: in-memory token is gone but the httpOnly cookie is
// still valid. Call /auth/me to pull fresh user data and re-hydrate the
// token sentinel so axios adds a Bearer header alongside the cookie.
//
// `useQuery` v5 removed the `onSuccess` / `onError` options, so we wire
// the side effects through `useEffect` watching `data` / `error` — the
// old cast-and-pray pattern silently dropped both branches.
export const useRestoreSession = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  const query = useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/auth/me");
      return data.data;
    },
    enabled: isAuthenticated && !token,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setAuth("cookie", query.data);
  }, [query.data, setAuth]);

  useEffect(() => {
    if (query.error) logout();
  }, [query.error, logout]);

  return query;
};

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => axiosInstance.post("/auth/logout"),
    onSettled: () => {
      logout();
      queryClient.clear();
      window.location.href = "/login";
    },
  });
};
