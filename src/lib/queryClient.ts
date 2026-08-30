import { QueryClient } from '@tanstack/react-query';
import { authKeys } from '@/lib/queryKeys';

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

type ResetAuthSessionStateOptions = {
  keepAuthMe?: boolean;
};

const isAuthMeQuery = (queryKey: readonly unknown[]): boolean => {
  const authMeKey = authKeys.me();
  return (
    queryKey.length === authMeKey.length &&
    queryKey.every((part, index) => part === authMeKey[index])
  );
};

export const resetAuthSessionState = (
  client: QueryClient = queryClient,
  options: ResetAuthSessionStateOptions = {},
) => {
  void client.cancelQueries({ type: 'all' });
  if (options.keepAuthMe) {
    client.removeQueries({
      predicate: (query) => !isAuthMeQuery(query.queryKey),
    });
  } else {
    client.removeQueries({ type: 'all' });
  }
  client.getMutationCache().clear();
};
