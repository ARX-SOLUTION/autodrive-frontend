import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import {
  ScheduleTemplate,
  CreateTemplatePayload,
  CalendarLesson,
  GenerateResult,
} from '@/types/schedule';

export const useScheduleTemplates = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ScheduleTemplate[]>({
    queryKey: ['schedule-templates', branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/schedule/templates');
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data } = await axiosInstance.post('/schedule/templates', payload);
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-templates'] }),
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/schedule/templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-templates'] }),
  });
};

export const useGenerateLessons = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { weeks: number; groupId?: string }) => {
      const { data } = await axiosInstance.post('/schedule/generate', payload);
      return data?.data || (data as GenerateResult);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-lessons'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
};

export const useCalendarLessons = (dateFrom: string, dateTo: string) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<CalendarLesson[]>({
    queryKey: ['calendar-lessons', dateFrom, dateTo, branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/schedule/calendar', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: (!!branchId || isCrossTenant) && !!dateFrom && !!dateTo,
  });
};
