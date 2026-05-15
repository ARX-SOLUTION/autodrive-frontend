import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://autodrive-backend-production.up.railway.app';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send httpOnly cookie on every request
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints whose 401 must NOT trigger the global logout/redirect:
//   - /auth/login: the form needs to show "wrong credentials" and keep
//     the fields filled. Redirecting to /login (where the user already
//     is) just reloads the page and wipes the form.
//   - /auth/me:    useRestoreSession handles 401 itself by calling
//     logout(), so the interceptor would only double-fire.
const SKIP_LOGOUT_ON_401 = /\/auth\/(login|me)(?:\?|$)/;

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      if (!SKIP_LOGOUT_ON_401.test(url)) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
