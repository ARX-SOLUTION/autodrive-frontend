import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types/user';



export const useOperators = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === 'owner' || role === 'dev';
  return useQuery<User[]>({
    queryKey: ['operators', branchId],
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get('/users', { params: { role: 'operator' } });
        const arr = res?.data?.data || res?.data;
        if (Array.isArray(arr)) return arr;
        if (Array.isArray(res)) return res;
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useCreateOperator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (op: { fullName: string; phone: string; branchId: string }) => {
      const { data } = await axiosInstance.post('/users', { ...op, role: 'operator' });
      return data?.data || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  });
};

export const useUpdateOperator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...op }: { id: string; fullName?: string; phone?: string; branchId?: string }) => {
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
