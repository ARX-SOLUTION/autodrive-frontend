import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import {
  Lesson,
  CreateLessonPayload,
  UpdateLessonPayload,
  BatchAttendancePayload,
  PaginatedLessons,
  AttendanceHistoryRecord,
} from '@/types/attendance';
import type { CalendarLesson } from '@/types/schedule';
import { track } from '@/lib/umami';
import { parseListResponse } from '@/lib/listResponse';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { lessonKeys, attendanceKeys, scheduleKeys } from '@/lib/queryKeys';

export interface LessonsPageParams {
  branchId?: string;
  page: number;
  limit: number;
}

export const fetchLessonsPage = async (
  { page, limit }: LessonsPageParams,
  signal?: AbortSignal,
): Promise<PaginatedLessons> => {
  const { data: res } = await axiosInstance.get('/lessons', {
    params: { page, limit },
    signal,
  });
  const { data } = parseListResponse<Lesson>(res, page, limit);
  // Backend LessonListResponse is flat ({data,total,page,limit}), not nested
  // under meta. Preserve the real cross-page total when it is present.
  const total =
    (res as { data?: { total?: number } })?.data?.total ?? data.length;
  return { data, total, page, limit };
};

export const lessonsPageQueryOptions = (
  params: LessonsPageParams,
  enabled = true,
) =>
  queryOptions({
    queryKey: lessonKeys.page({ ...params }),
    queryFn: ({ signal }) => fetchLessonsPage(params, signal),
    enabled,
  });

export const useLessons = (page = 1, limit = 50) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery(
    lessonsPageQueryOptions(
      { branchId, page, limit },
      !!branchId || isCrossTenant,
    ),
  );
};

// A student's attendance history across lessons (autodrive-6ef.26) — distinct
// from useLessons/useLessonById, which query per-lesson rosters.
export const attendanceHistoryQueryOptions = (
  studentId?: string,
  limit = 20,
  enabled = !!studentId,
) =>
  queryOptions({
    queryKey: attendanceKeys.history(studentId, { limit }),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/attendance', {
        params: { student_id: studentId, limit },
        signal,
      });
      return parseListEnvelope<AttendanceHistoryRecord>(res, 'attendance').data;
    },
    enabled,
  });

export const useAttendanceHistory = (studentId?: string, limit = 20) =>
  useQuery(attendanceHistoryQueryOptions(studentId, limit));

export const lessonDetailQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: lessonKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get(`/lessons/${id}`, { signal });
      return parseItemEnvelope<Lesson>(data, 'lesson');
    },
    enabled,
  });

export const useLessonById = ({ id }: { id: string }) =>
  useQuery(lessonDetailQueryOptions(id));

export const useCreateLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLessonPayload) => {
      const { data } = await axiosInstance.post('/lessons', payload);
      return parseItemEnvelope<Lesson>(data, 'lesson');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonKeys.all });
      track('lesson_create');
    },
  });
};

// SLICE B (autodrive-vh0.4): PATCH /lessons/:id, teacher-only on the
// backend (@Roles(teacher)) -- see AttendancePage's canEditLesson for the
// matching FE gate. Mirrors useCreateLesson/useDeleteLesson's invalidation.
export const useUpdateLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdateLessonPayload & { id: string }) => {
      const { data } = await axiosInstance.patch(`/lessons/${id}`, payload);
      return parseItemEnvelope<Lesson>(data, 'lesson');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonKeys.all });
      track('lesson_update');
    },
  });
};

export const useBatchAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    // One attendance write at a time keeps snapshot rollback deterministic
    // when two drawers save against the same cache in quick succession.
    scope: { id: 'attendance-batch' },
    mutationFn: async (payload: BatchAttendancePayload) => {
      const { data } = await axiosInstance.post('/attendance/batch', payload);
      return parseItemEnvelope(data, 'attendance-batch');
    },
    onMutate: async (variables) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: lessonKeys.all }),
        qc.cancelQueries({ queryKey: scheduleKeys.calendar() }),
        qc.cancelQueries({ queryKey: attendanceKeys.all }),
      ]);

      const lessonSnapshots = qc.getQueriesData<Lesson | PaginatedLessons>({
        queryKey: lessonKeys.all,
      });
      const calendarSnapshots = qc.getQueriesData<CalendarLesson[]>({
        queryKey: scheduleKeys.calendar(),
      });

      const statuses = new Map(
        variables.records.map((record) => [record.studentId, record.status]),
      );

      qc.setQueriesData<Lesson | PaginatedLessons>(
        { queryKey: lessonKeys.all },
        (cached) => {
          if (!cached) return cached;

          const updateLesson = (lesson: Lesson): Lesson => {
            if (lesson.id !== variables.lessonId) return lesson;
            return {
              ...lesson,
              attendance: lesson.attendance.map((record) => {
                const status = statuses.get(record.student_id);
                return status && status !== record.status
                  ? { ...record, status }
                  : record;
              }),
            };
          };

          if ('data' in cached) {
            return { ...cached, data: cached.data.map(updateLesson) };
          }
          return updateLesson(cached);
        },
      );

      qc.setQueriesData<CalendarLesson[]>(
        { queryKey: scheduleKeys.calendar() },
        (cached) =>
          cached?.map((lesson) =>
            lesson.id === variables.lessonId
              ? {
                  ...lesson,
                  present_count: variables.records.filter(
                    (record) => record.status === 'present',
                  ).length,
                  total_count: variables.records.length,
                }
              : lesson,
          ),
      );

      return { lessonSnapshots, calendarSnapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.lessonSnapshots ?? []) {
        qc.setQueryData(queryKey, data);
      }
      for (const [queryKey, data] of context?.calendarSnapshots ?? []) {
        qc.setQueryData(queryKey, data);
      }
    },
    onSuccess: () => {
      track('attendance_mark');
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: lessonKeys.all }),
        qc.invalidateQueries({ queryKey: scheduleKeys.calendar() }),
        qc.invalidateQueries({ queryKey: attendanceKeys.all }),
      ]),
  });
};

export const useDeleteLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/lessons/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonKeys.all });
    },
  });
};
