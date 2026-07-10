import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { Group, GroupOverview, GroupsById } from '@/types/group';
import { track } from '@/lib/umami';

export const useGroups = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === 'owner' || role === 'dev';
  return useQuery<Group[]>({
    queryKey: ['groups', branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/groups');
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useGroupsOverview = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === 'owner' || role === 'dev';
  return useQuery<GroupOverview[]>({
    queryKey: ['groups-overview', branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/groups/overview');
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useGroupsById = ({ id }: { id: string }) =>
  useQuery<GroupsById>({
    queryKey: ['groups', 'detail', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/groups/${id}`);
      return data?.data || data;
    },
    enabled: !!id,
  });

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (group: {
      name: string;
      branchId: string;
      courseType: string;
    }) => {
      const { data } = await axiosInstance.post('/groups', group);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups-overview'] });
      track('group_create');
    },
  });
};

export const useUpdateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...group
    }: {
      id: string;
      name?: string;
      branchId?: string;
      courseType?: string;
    }) => {
      const { data } = await axiosInstance.patch(`/groups/${id}`, group);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups-overview'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/groups/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups-overview'] });
    },
  });
};
