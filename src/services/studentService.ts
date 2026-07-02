import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { Student, CourseType } from '@/types/student';
import type { CreateStudentPayload } from '@/components/ui/StudentModal';

export const useStudents = (
  courseType?: CourseType,
  branchId?: string,
  page?: number,
  limit?: number,
  operatorId?: string,
  options?: { enabled?: boolean },
) => {
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  const baseEnabled = !!branchId || isOwnerOrDev;
  return useQuery<Student[]>({
    queryKey: ['students', courseType, branchId, page, limit, operatorId],
    enabled: (options?.enabled ?? true) && baseEnabled,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/students', {
        params: {
          course_type: courseType,
          branch_id: branchId,
          page,
          limit,
          operator_id: operatorId,
        },
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
  });
};

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (student: CreateStudentPayload) => {
      const { data } = await axiosInstance.post('/students', student);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
    },
  });
};

export const useUpdateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...student
    }: Partial<CreateStudentPayload> & { id: string }) => {
      const { data } = await axiosInstance.patch(`/students/${id}`, student);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
    },
  });
};

export const useDeleteStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/students/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
    },
  });
};

export const searchStudents = async (q: string): Promise<Student[]> => {
  const { data } = await axiosInstance.get('/students', {
    params: { search: q },
  });
  const arr = data?.data;
  if (Array.isArray(arr)) return arr;
  if (Array.isArray(data)) return data;
  return [];
};

export const bulkCreateStudents = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosInstance.post('/students/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
