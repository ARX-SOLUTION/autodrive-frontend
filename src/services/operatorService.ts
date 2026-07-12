import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';

export const useOperators = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: ['operators', branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/users', {
        params: { role: 'operator' },
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

// Real server-side pagination for OperatorsPage (autodrive-0id). `search` is
// forwarded to GET /users too (autodrive-b85.3) -- it now matches
// name/email/phone (autodrive-3kl), so the page no longer needs to
// re-filter the current page client-side.
export const useOperatorsPage = (
  page: number,
  limit: number,
  search?: string,
) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<User>>({
    queryKey: ['operators', 'page', branchId, page, limit, search],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/users', {
        params: {
          role: 'operator',
          page,
          limit,
          search: search || undefined,
        },
      });
      return parseListResponse<User>(data, page, limit);
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useCreateOperator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (op: {
      fullName: string;
      phone: string;
      // matches backend CreateUserDto: branchId is @IsOptional()
      branchId?: string;
    }) => {
      const { data } = await axiosInstance.post('/users', {
        ...op,
        role: 'operator',
      });
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  });
};

export const useUpdateOperator = () => {
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
    }) => {
      const { data } = await axiosInstance.patch(`/users/${id}`, op);
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  });
};

export const useDeleteOperator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  });
};
