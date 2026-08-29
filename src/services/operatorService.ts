import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { operatorKeys, userKeys } from '@/lib/queryKeys';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UsersQuery,
} from '@/shared/api/contract';

export const useOperators = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: operatorKeys.list({ branchId }),
    // autodrive-6ef.17: operator lists are stable org structure, so they can
    // use a longer stale window than the 30s global default.
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get<unknown>('/users', {
        params: { role: 'operator' } satisfies UsersQuery,
        signal,
      });
      return parseListEnvelope<User>(res, 'operators').data;
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
    queryKey: operatorKeys.page({ branchId, page, limit, search }),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>('/users', {
        params: {
          role: 'operator',
          page,
          limit,
          search: search || undefined,
        } satisfies UsersQuery,
        signal,
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
      const request: Pick<
        CreateUserRequest,
        'fullName' | 'phone' | 'branchId'
      > & {
        role: 'operator';
      } = {
        ...op,
        role: 'operator',
      };
      const { data } = await axiosInstance.post<unknown>('/users', request);
      return parseItemEnvelope<User>(data, 'operator');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operatorKeys.all });
    },
  });
};

export const useUpdateOperator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...op }: { id: string } & UpdateUserRequest) => {
      const { data } = await axiosInstance.patch<unknown>(`/users/${id}`, op);
      return parseItemEnvelope<User>(data, 'operator');
    },
    // UserDetailPage (/users/:id) reads via userKeys.detail(id), a root
    // operatorKeys.all doesn't cover -- an already-open detail tab kept
    // showing the pre-edit name/phone for up to 30s (autodrive-52v.2).
    // Same dual-invalidate idiom as paymentService's payment mutations.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operatorKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

export const useDeleteOperator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operatorKeys.all });
    },
  });
};
