import { QueryClient } from '@tanstack/react-query';

// Lifted out of App.tsx so the axios 401 interceptor (outside the React
// tree) can clear the same cache instance on session expiry.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
