import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';

export interface TelegramLinkStatus {
  linked: boolean;
  daily_report_enabled: boolean;
}

const LINK_STATUS_KEY = ['telegram', 'link-status'];

export const useTelegramLinkStatus = () =>
  useQuery<TelegramLinkStatus>({
    queryKey: LINK_STATUS_KEY,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/telegram/link-status');
      return res?.data || res;
    },
  });

export const useTelegramLinkToken = () =>
  useMutation({
    mutationFn: async () => {
      const { data: res } = await axiosInstance.post('/telegram/link-token');
      return (res?.data || res) as { deep_link: string };
    },
  });

export const useTelegramUnlink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.delete('/telegram/link');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINK_STATUS_KEY }),
  });
};

export const useTelegramDailyReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await axiosInstance.patch('/telegram/daily-report', { enabled });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINK_STATUS_KEY }),
  });
};
