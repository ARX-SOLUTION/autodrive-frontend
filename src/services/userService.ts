import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';

export const useUsers = (role?: string) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: ['users', branchId, role],
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/users', {
        params: role ? { role } : {},
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

// Real server-side pagination for list pages (autodrive-0id) -- GET /users
// defaults to limit=10; UsersPage was fetching once via useUsers and
// paginating client-side over that truncated result.
export const useUsersPage = (
  role: string,
  page: number,
  limit: number,
  filters?: { search?: string; branchId?: string; isActive?: boolean },
) => {
  const userBranchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<User>>({
    queryKey: ['users', 'page', userBranchId, role, page, limit, filters],
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get('/users', {
        params: {
          role,
          page,
          limit,
          search: filters?.search || undefined,
          branchId: filters?.branchId,
          isActive: filters?.isActive,
        },
        signal,
      });
      return parseListResponse<User>(data, page, limit);
    },
    enabled: !!userBranchId || isCrossTenant,
  });
};

export const useUser = (id?: string) =>
  useQuery<User>({
    queryKey: ['users', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get(`/users/${id}`);
      return res?.data || res;
    },
  });

export const useCreateManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      branchId: string;
    }) => {
      const { data } = await axiosInstance.post('/users', {
        ...m,
        role: 'manager',
      });
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...op
    }: {
      id: string;
      fullName?: string;
      phone?: string;
      branchId?: string;
      specialization?: 'THEORY' | 'PRACTICE';
    }) => {
      const { data } = await axiosInstance.patch(`/users/${id}`, op);
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};
