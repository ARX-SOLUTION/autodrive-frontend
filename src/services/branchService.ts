import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { Branch } from '@/types/branch';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { branchKeys } from '@/lib/queryKeys';

export const useBranches = (enabled = true) =>
  useQuery<Branch[]>({
    queryKey: branchKeys.list(),
    enabled,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/branches', { signal });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
};

export const useDeleteBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/branches/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
};
