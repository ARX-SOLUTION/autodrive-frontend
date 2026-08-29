import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { userKeys } from '@/lib/queryKeys';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UsersQuery,
} from '@/shared/api/contract';

// The generated schema marks specialization required, but the backend DTO
// accepts it only when supplied and the manager UI intentionally has no such
// field. Keep the role-specific request equal to the real manager payload.
type ManagerCreateRequest = Pick<
  CreateUserRequest,
  'fullName' | 'email' | 'password' | 'phone' | 'branchId' | 'role'
>;

export const useUsers = (role?: UsersQuery['role']) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: userKeys.list({ branchId, role, page: 1, limit: 100 }),
    // autodrive-6ef.17: user lists are stable org structure, so they can use
    // a longer stale window than the 30s global default.
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get<unknown>('/users', {
        params: { role, page: 1, limit: 100 } satisfies UsersQuery,
        signal,
      });
      return parseListEnvelope<User>(res, 'users').data;
    },
    enabled: !!branchId || isCrossTenant,
  });
};

// Real server-side pagination for list pages (autodrive-0id) -- GET /users
// defaults to limit=10; UsersPage was fetching once via useUsers and
// paginating client-side over that truncated result.
export const useUsersPage = (
  role: NonNullable<UsersQuery['role']>,
  page: number,
  limit: number,
  filters?: {
    search?: string;
    branchId?: string;
    isActive?: boolean;
    // autodrive-cg9: owner-only "show deleted" toggle on UsersPage. Never
    // sent unless the caller is an owner -- a non-owner sending it gets a
    // 403.
    includeDeleted?: boolean;
  },
) => {
  const userBranchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<User>>({
    queryKey: userKeys.page({
      branchId: userBranchId,
      role,
      page,
      limit,
      ...filters,
    }),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>('/users', {
        params: {
          role,
          page,
          limit,
          search: filters?.search || undefined,
          branchId: filters?.branchId,
          isActive: filters?.isActive,
          include_deleted: filters?.includeDeleted || undefined,
        } satisfies UsersQuery,
        signal,
      });
      return parseListResponse<User>(data, page, limit);
    },
    enabled: !!userBranchId || isCrossTenant,
  });
};

export const useUser = (id?: string) =>
  useQuery<User>({
    queryKey: userKeys.detail(id),
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get<unknown>(`/users/${id}`, {
        signal,
      });
      return parseItemEnvelope<User>(res, 'user');
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
      const request: ManagerCreateRequest = {
        ...m,
        role: 'manager',
      };
      const { data } = await axiosInstance.post<unknown>('/users', request);
      return parseItemEnvelope<User>(data, 'user');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...op }: { id: string } & UpdateUserRequest) => {
      const { data } = await axiosInstance.patch<unknown>(`/users/${id}`, op);
      return parseItemEnvelope<User>(data, 'user');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// autodrive-cg9: owner-only restore, paired with the includeDeleted list
// toggle above. Un-deletes only this row -- see UsersPage's restore confirm
// copy (common.confirm_restore_desc) for the no-cascade caveat.
export const useRestoreUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.patch(`/users/${id}/restore`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};
