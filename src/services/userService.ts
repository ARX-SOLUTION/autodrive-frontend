import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { User } from '@/types/user';

export const useUsers = (role?: string) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<User[]>({
    queryKey: ['users', branchId, role],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/users', {
        params: role ? { role } : {},
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

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
