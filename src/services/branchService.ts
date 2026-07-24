import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { Branch } from '@/types/branch';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { branchKeys } from '@/lib/queryKeys';

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
    // autodrive-6ef.17: branch list is org structure, rarely changes -- longer
    // than the 30s global default (matches blogService's precedent).
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/branches', {
        params: { include_deleted: includeDeleted || undefined },
        signal,
      });
      return parseListEnvelope<Branch>(res, 'branches').data;
    },
  });

export const useBranch = (id?: string) =>
  useQuery<Branch>({
    queryKey: branchKeys.detail(id),
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get(`/branches/${id}`, {
        signal,
      });
      return parseItemEnvelope<Branch>(res, 'branch');
    },
  });

export const useCreateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: {
      name: string;
      location: string;
      phone?: string;
    }) => {
      const { data } = await axiosInstance.post('/branches', b);
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
    mutationFn: async ({
      id,
      ...b
    }: {
      id: string;
      name?: string;
      location?: string;
      phone?: string;
    }) => {
      const { data } = await axiosInstance.patch(`/branches/${id}`, b);
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
