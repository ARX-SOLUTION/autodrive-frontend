import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/errors';

/**
 * Shared mutation `onError` handler: shows the extracted error message,
 * optionally with a Retry action that re-runs the failed mutation.
 *
 * Usage in a mutation `onError`:
 *   onError: (err) => mutationErrorToast(err, t, () => mutation.mutate(vars))
 * Omit `retry` when the mutation fn/vars aren't cleanly available at the
 * call site -- degrades to a plain error toast.
 */
export function mutationErrorToast(
  err: unknown,
  t: (key: string) => string,
  retry?: () => void,
) {
  toast.error(
    extractErrorMessage(err, t('common.error')),
    retry
      ? { action: { label: t('common.retry'), onClick: retry } }
      : undefined,
  );
}
