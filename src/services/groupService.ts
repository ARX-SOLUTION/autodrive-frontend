import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
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
  // autodrive-cg9: owner-only "show deleted" toggle on GroupsPage. Never
  // sent unless the caller is an owner -- a non-owner sending it gets a 403.
  includeDeleted?: boolean;
}

export interface GroupListQueryParams extends GroupListParams {
  authBranchId?: string;
}

export const fetchGroups = async (
  params: GroupListParams,
  signal?: AbortSignal,
): Promise<Group[]> => {
  const { data: res } = await axiosInstance.get('/groups', {
    params: {
      search: params.search || undefined,
      branch_id: params.branchId || undefined,
      course_type: params.courseType || undefined,
      include_deleted: params.includeDeleted || undefined,
    },
    signal,
  });
  return parseListEnvelope<Group>(res, 'groups').data;
};

export const groupsListQueryOptions = (
  params: GroupListQueryParams = {},
  enabled = true,
) =>
  queryOptions({
    queryKey: groupKeys.list({
      authBranchId: params.authBranchId,
      branchId: params.branchId,
      search: params.search,
      courseType: params.courseType,
      includeDeleted: params.includeDeleted,
    }),
    // Group lists are stable org structure, so they can use a longer stale
    // window than the 30s global default.
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => fetchGroups(params, signal),
    enabled,
  });

// Callers that don't pass params (StudentModal, SchedulePage, AttendancePage)
// keep getting the full tenant-scoped list, unchanged. GroupsPage passes
// search/branchId/courseType so GET /groups filters server-side instead of
// the page re-filtering the full list client-side (autodrive-b85.5).
export const useGroups = (params: GroupListParams = {}) => {
  const authBranchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery(
    groupsListQueryOptions(
      { ...params, authBranchId },
      !!authBranchId || isCrossTenant,
    ),
  );
};

export const groupsOverviewQueryOptions = (branchId?: string, enabled = true) =>
  queryOptions({
    queryKey: groupKeys.overview({ branchId }),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/groups/overview', {
        signal,
      });
      return parseListEnvelope<GroupOverview>(res, 'groups-overview').data;
    },
    enabled,
  });

export const useGroupsOverview = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const isCrossTenant = useIsCrossTenant();
  return useQuery(
    groupsOverviewQueryOptions(branchId, !!branchId || isCrossTenant),
  );
};

export const groupDetailQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: groupKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get(`/groups/${id}`, { signal });
      return parseItemEnvelope<Group>(data, 'group');
    },
    enabled,
  });

export const useGroup = (id?: string) => useQuery(groupDetailQueryOptions(id));

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (group: {
      name: string;
      branchId: string;
      courseType: string;
      teacherId?: string | null;
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
      teacherId?: string | null;
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

// autodrive-cg9: owner-only restore, paired with the includeDeleted list
// toggle above. Deliberately does NOT invalidate studentKeys (unlike
// useDeleteGroup below) -- restore does not un-null the groupId that delete
// cleared on each enrolled student (see GroupsPage's restore confirm copy,
// common.confirm_restore_desc), so there is nothing student-side to refetch.
export const useRestoreGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.patch(`/groups/${id}/restore`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      track('group_restore');
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
