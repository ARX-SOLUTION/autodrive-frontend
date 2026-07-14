import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Course, CreateCoursePayload } from '@/types/course';
import { track } from '@/lib/umami';

export interface CourseListParams {
  branchId?: string;
  courseType?: string;
  search?: string;
}

export const useCourses = (params: CourseListParams = {}) => {
  const { branchId, courseType, search } = params;
  const isCrossTenant = useIsCrossTenant();
  return useQuery<Course[]>({
    queryKey: ['courses', branchId, courseType, search],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/courses', {
        params: {
          branch_id: branchId || undefined,
          course_type: courseType || undefined,
          search: search || undefined,
        },
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useCourse = (id?: string) =>
  useQuery<Course>({
    queryKey: ['courses', 'detail', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/courses/${id}`);
      return data?.data || data;
    },
    enabled: !!id,
  });

export const useCreateCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (course: CreateCoursePayload) => {
      const { data } = await axiosInstance.post('/courses', course);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
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
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
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
      qc.invalidateQueries({ queryKey: ['courses'] });
      track('course_delete');
    },
  });
};
