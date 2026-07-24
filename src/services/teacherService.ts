import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { teacherKeys, userKeys } from '@/lib/queryKeys';

export type Specialization = 'THEORY' | 'PRACTICE';

export const useTeachers = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: teacherKeys.list({ branchId }),
    // autodrive-6ef.17: teacher list is org structure, rarely changes --
    // longer than the 30s global default (matches blogService's precedent).
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/users', {
        params: { role: 'teacher' },
        signal,
      });
      return parseListEnvelope<User>(res, 'teachers').data;
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
    queryKey: teacherKeys.page({ branchId, page, limit, search }),
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
      return parseItemEnvelope<User>(data, 'teacher');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
    },
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
      return parseItemEnvelope<User>(data, 'teacher');
    },
    // UserDetailPage (/users/:id) reads via userKeys.detail(id), a root
    // teacherKeys.all doesn't cover -- an already-open detail tab kept
    // showing the pre-edit name/phone for up to 30s (autodrive-52v.2).
    // Same dual-invalidate idiom as paymentService's payment mutations.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

export const useDeleteTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
    },
  });
};
