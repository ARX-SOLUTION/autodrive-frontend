import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Group, GroupOverview } from '@/types/group';
import { track } from '@/lib/umami';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { groupKeys, studentKeys } from '@/lib/queryKeys';

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
    queryKey: groupKeys.list({ authBranchId, branchId, search, courseType }),
    // autodrive-6ef.17: group list is org structure, rarely changes -- longer
    // than the 30s global default (matches blogService's precedent).
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/groups', {
        params: {
          search: search || undefined,
          branch_id: branchId || undefined,
          course_type: courseType || undefined,
        },
        signal,
      });
      return parseListEnvelope<Group>(res, 'groups').data;
    },
    enabled: !!authBranchId || isCrossTenant,
  });
};

export const useGroupsOverview = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery<GroupOverview[]>({
    queryKey: groupKeys.overview({ branchId }),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/groups/overview', {
        signal,
      });
      return parseListEnvelope<GroupOverview>(res, 'groups-overview').data;
    },
    enabled: !!branchId || isCrossTenant,
  });
};

export const useGroup = (id?: string) =>
  useQuery<Group>({
    queryKey: groupKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get(`/groups/${id}`, { signal });
      return parseItemEnvelope<Group>(data, 'group');
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
      return parseItemEnvelope<Group>(data, 'group');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
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
      return parseItemEnvelope<Group>(data, 'group');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      qc.invalidateQueries({ queryKey: studentKeys.all });
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
      // groupKeys.all (root 'groups') prefix-matches groupKeys.overview too,
      // so one call now covers what used to be two separate invalidations.
      qc.invalidateQueries({ queryKey: groupKeys.all });
      // Backend nulls groupId on every enrolled student in the same
      // transaction (autodrive-f9u.11) -- without this, a cached student
      // list/detail view keeps showing the deleted group. studentKeys.all
      // (root 'students') also covers the old singular 'student' detail key.
      qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};
