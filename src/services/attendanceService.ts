import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import {
  Lesson,
  CreateLessonPayload,
  BatchAttendancePayload,
  PaginatedLessons,
  AttendanceHistoryRecord,
} from '@/types/attendance';
import { track } from '@/lib/umami';
import { parseListResponse } from '@/lib/listResponse';

export const useLessons = (page = 1, limit = 50) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<PaginatedLessons>({
    queryKey: ['lessons', branchId, page, limit],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/lessons', {
        params: { page, limit },
      });
      const { data } = parseListResponse<Lesson>(res, page, limit);
      // ponytail: backend LessonListResponse is flat ({data,total,page,limit},
      // not nested under meta), so read total off the raw envelope directly
      // instead of parseListResponse's fallback (which undercounts to this
      // page's row count when meta is absent).
      const total =
        (res as { data?: { total?: number } })?.data?.total ?? data.length;
      return { data, total, page, limit };
    },
    enabled: !!branchId || isCrossTenant,
  });
};

// A student's attendance history across lessons (autodrive-6ef.26) — distinct
// from useLessons/useLessonById, which query per-lesson rosters.
export const useAttendanceHistory = (studentId?: string, limit = 20) =>
  useQuery<AttendanceHistoryRecord[]>({
    queryKey: ['attendance', 'history', studentId, limit],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/attendance', {
        params: { student_id: studentId, limit },
      });
      return res?.data?.data || res?.data || [];
    },
    enabled: !!studentId,
  });

export const useLessonById = ({ id }: { id: string }) =>
  useQuery<Lesson>({
    queryKey: ['lessons', 'detail', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/lessons/${id}`);
      return data?.data || data;
    },
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
      track('lesson_create');
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
      track('attendance_mark');
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
