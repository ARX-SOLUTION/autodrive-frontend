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
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/users', {
        params: { role: 'teacher' },
        signal,
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

// Real server-side pagination for TeachersPage (autodrive-0id). `search` is
// forwarded to GET /users too (autodrive-b85.3) -- it now matches
// name/email/phone (autodrive-3kl), so the page no longer needs to
// re-filter the current page client-side.
export const useTeachersPage = (
  page: number,
  limit: number,
  search?: string,
) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<User>>({
    queryKey: ['teachers', 'page', branchId, page, limit, search],
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get('/users', {
        params: { role: 'teacher', page, limit, search: search || undefined },
        signal,
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
