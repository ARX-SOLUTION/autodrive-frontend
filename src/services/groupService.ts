import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Group, GroupOverview } from '@/types/group';
import { track } from '@/lib/umami';

export interface GroupListParams {
  search?: string;
  branchId?: string;
  courseType?: string;
}

// Callers that don't pass params (StudentModal, SchedulePage, AttendancePage)
// keep getting the full tenant-scoped list, unchanged. GroupsPage passes
// search/branchId/courseType so GET /groups filters server-side instead of
// the page re-filtering the full list client-side (autodrive-b85.5).
export const useGroups = (params: GroupListParams = {}) => {
  const { search, branchId, courseType } = params;
  const authBranchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<Group[]>({
    queryKey: ['groups', authBranchId, branchId, search, courseType],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/groups', {
        params: {
          search: search || undefined,
          branch_id: branchId || undefined,
          course_type: courseType || undefined,
        },
      });
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!authBranchId || isCrossTenant,
  });
};

export const useGroupsOverview = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<GroupOverview[]>({
    queryKey: ['groups-overview', branchId],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/groups/overview');
      const arr = res?.data?.data || res?.data;
      if (Array.isArray(arr)) return arr;
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useGroup = (id?: string) =>
  useQuery<Group>({
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
