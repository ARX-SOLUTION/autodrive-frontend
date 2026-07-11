import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';

export type Specialization = 'THEORY' | 'PRACTICE';

export const useTeachers = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: ['teachers', branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/users', {
        params: { role: 'teacher' },
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

// Real server-side pagination for TeachersPage (autodrive-0id) -- GET
// /users defaults to limit=10; the page was fetching once via useTeachers
// and paginating client-side over that truncated result.
export const useTeachersPage = (page: number, limit: number) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<User>>({
    queryKey: ['teachers', 'page', branchId, page, limit],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/users', {
        params: { role: 'teacher', page, limit },
      });
      return parseListResponse<User>(data, page, limit);
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useCreateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: {
      fullName: string;
      phone: string;
      specialization: Specialization;
      branchId?: string;
    }) => {
      const { data } = await axiosInstance.post('/users', {
        ...t,
        role: 'teacher',
      });
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });
};

export const useUpdateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...t
    }: {
      id: string;
      fullName?: string;
      phone?: string;
      specialization?: Specialization;
      branchId?: string;
    }) => {
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
