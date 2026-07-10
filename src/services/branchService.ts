import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { Branch } from '@/types/branch';

export const useBranches = (enabled = true) =>
  useQuery<Branch[]>({
    queryKey: ['branches'],
    enabled,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/branches');
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
  });

export const useBranch = (id?: string) =>
  useQuery<Branch>({
    queryKey: ['branches', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get(`/branches/${id}`);
      return res?.data?.data || res?.data;
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
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
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
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
};

export const useDeleteBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/branches/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
};
