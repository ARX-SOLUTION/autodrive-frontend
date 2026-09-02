import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
import {
  Course,
  CreateCoursePayload,
  UpdateCoursePayload,
} from '@/types/course';
import { track } from '@/lib/umami';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { courseKeys } from '@/lib/queryKeys';
import type { CoursesQuery } from '@/shared/api/contract';

export interface CourseListParams {
  branchId?: string;
  courseType?: CoursesQuery['course_type'];
  search?: string;
}

export const fetchCourses = async (
  params: CourseListParams = {},
  signal?: AbortSignal,
): Promise<Course[]> => {
  const { data: res } = await axiosInstance.get<unknown>('/courses', {
    params: {
      branch_id: params.branchId || undefined,
      course_type: params.courseType || undefined,
      search: params.search || undefined,
    } satisfies CoursesQuery,
    signal,
  });
  return parseListEnvelope<Course>(res, 'courses').data;
};

export const coursesListQueryOptions = (
  params: CourseListParams = {},
  enabled = true,
) =>
  queryOptions({
    queryKey: courseKeys.list({
      branchId: params.branchId,
      courseType: params.courseType,
      search: params.search,
    }),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => fetchCourses(params, signal),
    enabled,
  });

export const useCourses = (params: CourseListParams = {}) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery(
    coursesListQueryOptions(params, !!params.branchId || isCrossTenant),
  );
};

export const courseDetailQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: courseKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>(`/courses/${id}`, {
        signal,
      });
      return parseItemEnvelope<Course>(data, 'course');
    },
    enabled,
  });

export const useCourse = (id?: string) =>
  useQuery(courseDetailQueryOptions(id));

export const useCreateCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (course: CreateCoursePayload) => {
      const { data } = await axiosInstance.post<unknown>('/courses', course);
      return parseItemEnvelope<Course>(data, 'course');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseKeys.all });
      track('course_create');
    },
  });
};

export const useUpdateCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...course
    }: { id: string } & UpdateCoursePayload) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/courses/${id}`,
        course,
      );
      return parseItemEnvelope<Course>(data, 'course');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseKeys.all });
      track('course_update');
    },
  });
};

export const useDeleteCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/courses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseKeys.all });
      track('course_delete');
    },
  });
};
