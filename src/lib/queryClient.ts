import { QueryClient } from '@tanstack/react-query';

const getHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }

  const response = error.response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return undefined;
  }

  return typeof response.status === 'number' ? response.status : undefined;
};

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1) return false;

  const status = getHttpStatus(error);
  // Retrying deterministic 4xx responses wastes the user's rate-limit
  // budget. In particular, a 429 window is much longer than React Query's
  // immediate retry delay, so the retry can only amplify the failure.
  if (status && status >= 400 && status < 500) return false;

  return true;
}

// Lifted out of App.tsx so the axios 401 interceptor (outside the React
// tree) can clear the same cache instance on session expiry.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  },
});
