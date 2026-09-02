import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { Branch } from '@/types/branch';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { branchKeys } from '@/lib/queryKeys';
import type {
  BranchesQuery,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/shared/api/contract';

// autodrive-cg9: includeDeleted is a second positional param (not folded
// into an options object) so every existing zero-arg/one-arg call site
// (PersonModal, StudentModal, StudentsPage, GroupsPage, ...) keeps working
// unchanged -- only BranchesPage's owner-only "show deleted" toggle passes
// it. Never true unless the caller is an owner -- a non-owner sending it
// gets a 403.
export const useBranches = (enabled = true, includeDeleted = false) =>
  useQuery<Branch[]>({
    queryKey: branchKeys.list({ includeDeleted }),
    enabled,
    // autodrive-6ef.17: branch lists are stable org structure, so they can use
    // a longer stale window than the 30s global default.
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get<unknown>('/branches', {
        params: {
          include_deleted: includeDeleted || undefined,
        } satisfies BranchesQuery,
        signal,
      });
      return parseListEnvelope<Branch>(res, 'branches').data;
    },
  });

export const fetchBranch = async (
  id: string,
  signal?: AbortSignal,
): Promise<Branch> => {
  const { data: res } = await axiosInstance.get<unknown>(`/branches/${id}`, {
    signal,
  });
  return parseItemEnvelope<Branch>(res, 'branch');
};

export const branchDetailQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: branchKeys.detail(id),
    enabled: !!id,
    queryFn: ({ signal }) => fetchBranch(id!, signal),
  });

export const useBranch = (id?: string) =>
  useQuery(branchDetailQueryOptions(id));

export const useCreateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: CreateBranchRequest) => {
      const { data } = await axiosInstance.post<unknown>('/branches', b);
      return parseItemEnvelope<Branch>(data, 'branch');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
};

export const useUpdateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...b }: { id: string } & UpdateBranchRequest) => {
      const { data } = await axiosInstance.patch<unknown>(`/branches/${id}`, b);
      return parseItemEnvelope<Branch>(data, 'branch');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
};

export const useDeleteBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
};

// autodrive-cg9: owner-only restore, paired with the includeDeleted list
// toggle above. Un-deletes only this row -- see BranchesPage's restore
// confirm copy (common.confirm_restore_desc) for the no-cascade caveat
// (branch delete cascades to staff/students/groups/lessons; restore does
// not bring any of that back).
export const useRestoreBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.patch(`/branches/${id}/restore`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
};
