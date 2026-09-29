import type { AxiosError } from 'axios';
import i18n from 'i18next';

/**
 * Backend error envelope produced by NestJS `HttpExceptionFilter`.
 * See CLAUDE.md §5 — Backend response shape.
 */
type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    // class-validator constraint strings, e.g. ["phone must be a valid phone number"].
    // Present on VALIDATION_ERROR, where `message` is just the generic "Validation failed".
    // `{ reason }` on CONFLICT when a write lost an optimistic-concurrency race.
    details?: string[] | { reason?: string };
  };
};

/** 409 from a write whose row was changed by someone else since it was read. */
export function isConcurrentUpdateError(err: unknown): boolean {
  const e = err as AxiosError<ApiErrorEnvelope>;
  const details = e?.response?.data?.error?.details;
  return (
    e?.response?.status === 409 &&
    !Array.isArray(details) &&
    details?.reason === 'concurrent_update'
  );
}

/**
 * Extracts a server-provided error message from an Axios error.
 * Falls back to the supplied user-facing string when the server did not
 * surface a message (network failure, non-Axios error, malformed payload).
 *
 * When the backend returns validation `details` (field-level messages), those
 * are surfaced instead of the generic "Validation failed" `message`.
 *
 * Usage in a mutation `onError`:
 *   onError: (err) => toast.error(extractErrorMessage(err, t('common.error')))
 */
export function extractErrorMessage(
  err: unknown,
  fallback = 'An error occurred',
): string {
  if (isConcurrentUpdateError(err)) {
    return i18n.t('common.concurrent_update');
  }
  const e = err as AxiosError<ApiErrorEnvelope>;
  const details = e?.response?.data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.join('; ');
  }
  return e?.response?.data?.error?.message ?? fallback;
}
