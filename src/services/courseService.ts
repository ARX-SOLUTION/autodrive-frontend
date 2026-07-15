import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Course, CreateCoursePayload } from '@/types/course';
import { track } from '@/lib/umami';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { courseKeys } from '@/lib/queryKeys';

export interface CourseListParams {
  branchId?: string;
  courseType?: string;
  search?: string;
}

export const useCourses = (params: CourseListParams = {}) => {
  const { branchId, courseType, search } = params;
  const isCrossTenant = useIsCrossTenant();
  return useQuery<Course[]>({
    queryKey: courseKeys.list({ branchId, courseType, search }),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/courses', {
        params: {
          branch_id: branchId || undefined,
          course_type: courseType || undefined,
          search: search || undefined,
        },
        signal,
      });
      return parseListEnvelope<Course>(res, 'courses').data;
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useCourse = (id?: string) =>
  useQuery<Course>({
    queryKey: courseKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get(`/courses/${id}`, { signal });
      return parseItemEnvelope<Course>(data, 'course');
    },
    enabled: !!id,
  });

export const useCreateCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (course: CreateCoursePayload) => {
      const { data } = await axiosInstance.post('/courses', course);
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
    }: Partial<CreateCoursePayload> & { id: string }) => {
      const { data } = await axiosInstance.patch(`/courses/${id}`, course);
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
