import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { telegramKeys } from '@/lib/queryKeys';
import {
  useTelegramExpenseDigest,
  useTelegramExpenseDigestSnooze,
  useTelegramLinkStatus,
} from '@/services/telegramService';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const makeWrapper =
  (queryClient: QueryClient) =>
  ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Telegram expense digest service contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expense digest preferences from link status', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        data: {
          linked: true,
          daily_report_enabled: false,
          expense_digest_enabled: true,
          expense_digest_snoozed_until: '2026-03-20T08:00:00.000Z',
        },
      },
    });
    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useTelegramLinkStatus(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      expense_digest_enabled: true,
      expense_digest_snoozed_until: '2026-03-20T08:00:00.000Z',
    });
  });

  it('updates the expense digest preference and invalidates link status', async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: undefined });
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTelegramExpenseDigest(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(axiosInstance.patch).toHaveBeenCalledWith(
      '/telegram/expense-digest',
      { enabled: true },
    );
    expect(result.current.data).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: telegramKeys.linkStatus(),
    });
  });

  it('snoozes the expense digest without a body and invalidates link status', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: undefined });
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTelegramExpenseDigestSnooze(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/telegram/expense-digest/snooze',
    );
    expect(result.current.data).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: telegramKeys.linkStatus(),
    });
  });
});
