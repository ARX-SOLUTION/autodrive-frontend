import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import {
  Lesson,
  CreateLessonPayload,
  BatchAttendancePayload,
  PaginatedLessons,
} from '@/types/attendance';

export const useLessons = (page = 1, limit = 50) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === 'owner' || role === 'dev';
  return useQuery<PaginatedLessons>({
    queryKey: ['lessons', branchId, page, limit],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/lessons', {
        params: { page, limit },
      });
      if (res && typeof res.total === 'number') return res as PaginatedLessons;
      if (Array.isArray(res?.data))
        return { data: res.data, total: res.data.length, page, limit };
      if (Array.isArray(res))
        return { data: res, total: res.length, page, limit };
      return { data: [], total: 0, page, limit };
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useLessonById = ({ id }: { id: string }) =>
  useQuery<Lesson | null>({
    queryKey: ['lessons', 'detail', id],
    queryFn: async () =>
      axiosInstance
        .get(`/lessons/${id}`)
        .then(({ data }) => data?.data || data)
        .catch(() => null),
    enabled: !!id,
  });

export const useCreateLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLessonPayload) => {
      const { data } = await axiosInstance.post('/lessons', payload);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
};

export const useBatchAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BatchAttendancePayload) => {
      const { data } = await axiosInstance.post('/attendance/batch', payload);
      return data?.data || data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
      qc.invalidateQueries({
        queryKey: ['lessons', 'detail', variables.lessonId],
      });
    },
  });
};

export const useDeleteLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/lessons/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
};
