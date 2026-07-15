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
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { scheduleKeys, lessonKeys } from '@/lib/queryKeys';

export const useScheduleTemplates = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ScheduleTemplate[]>({
    queryKey: scheduleKeys.templates({ branchId }),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/schedule/templates', {
        signal,
      });
      return parseListEnvelope<ScheduleTemplate>(res, 'schedule-templates')
        .data;
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data } = await axiosInstance.post('/schedule/templates', payload);
      return parseItemEnvelope<ScheduleTemplate>(data, 'schedule-template');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/schedule/templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
};

export const useGenerateLessons = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { weeks: number; groupId?: string }) => {
      const { data } = await axiosInstance.post('/schedule/generate', payload);
      return parseItemEnvelope<GenerateResult>(data, 'schedule-generate');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.all });
      qc.invalidateQueries({ queryKey: lessonKeys.all });
    },
  });
};

export const useCalendarLessons = (dateFrom: string, dateTo: string) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<CalendarLesson[]>({
    queryKey: scheduleKeys.calendar({ dateFrom, dateTo, branchId }),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/schedule/calendar', {
        params: { date_from: dateFrom, date_to: dateTo },
        signal,
      });
      return parseListEnvelope<CalendarLesson>(res, 'calendar-lessons').data;
    },
    enabled: (!!branchId || isCrossTenant) && !!dateFrom && !!dateTo,
  });
};
