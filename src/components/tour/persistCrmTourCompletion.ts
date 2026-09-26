import { toast } from 'sonner';
import i18n from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { authKeys } from '@/lib/queryKeys';
import { completeCrmTourRequest } from '@/services/authApi';
import { useAuthStore } from '@/store/authStore';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return 0;
  const response = error.response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return 0;
  }
  return typeof response.status === 'number' ? response.status : 0;
};

/** Close is already done. Retry the write, then toast if it still failed. */
export const persistCrmTourCompletion = async () => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const user = await completeCrmTourRequest();
      if (typeof user?.id === 'string' && typeof user.role === 'string') {
        useAuthStore.getState().setUser(user);
        queryClient.setQueryData(authKeys.me(), user);
      }
      return;
    } catch (error) {
      lastError = error;
      const status = statusOf(error);
      const retryable = status === 0 || status === 429 || status >= 500;
      if (!retryable || attempt === 2) break;
      await sleep(400 * 2 ** attempt);
    }
  }
  toast.error(i18n.t('crm_tour.save_error'));
  return lastError;
};
