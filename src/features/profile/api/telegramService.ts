import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { telegramKeys } from '@/lib/queryKeys';

export interface TelegramLinkStatus {
  linked: boolean;
  daily_report_enabled: boolean;
  expense_digest_enabled: boolean;
  expense_digest_snoozed_until: string | null;
}

export const useTelegramLinkStatus = () =>
  useQuery<TelegramLinkStatus>({
    queryKey: telegramKeys.linkStatus(),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/telegram/link-status', {
        signal,
      });
      return parseItemEnvelope<TelegramLinkStatus>(res, 'telegram-link-status');
    },
  });

export const useTelegramLinkToken = () =>
  useMutation({
    mutationFn: async () => {
      const { data: res } = await axiosInstance.post('/telegram/link-token');
      return parseItemEnvelope<{ deep_link: string }>(
        res,
        'telegram-link-token',
      );
    },
  });

export const useTelegramUnlink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.delete('/telegram/link');
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: telegramKeys.linkStatus() }),
  });
};

export const useTelegramDailyReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await axiosInstance.patch('/telegram/daily-report', { enabled });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: telegramKeys.linkStatus() }),
  });
};

export const useTelegramExpenseDigest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await axiosInstance.patch('/telegram/expense-digest', { enabled });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: telegramKeys.linkStatus() }),
  });
};

export const useTelegramExpenseDigestSnooze = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/telegram/expense-digest/snooze');
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: telegramKeys.linkStatus() }),
  });
};
