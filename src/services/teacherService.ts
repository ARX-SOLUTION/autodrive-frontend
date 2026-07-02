import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types/user';

export type Specialization = 'THEORY' | 'PRACTICE';


export const useTeachers = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === 'owner' || role === 'dev';
  return useQuery<User[]>({
    queryKey: ['teachers', branchId],
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get('/users', { params: { role: 'teacher' } });
        const arr = res?.data?.data || res?.data;
        if (Array.isArray(arr)) return arr;
        if (Array.isArray(res)) return res;
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useCreateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { fullName: string; phone: string; specialization: Specialization; branchId: string }) => {
      const { data } = await axiosInstance.post('/users', { ...t, role: 'teacher' });
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
};

export const useUpdateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...t }: { id: string; fullName?: string; phone?: string; specialization?: Specialization; branchId?: string }) => {
      const { data } = await axiosInstance.patch(`/users/${id}`, t);
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
};

export const useDeleteTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
};
