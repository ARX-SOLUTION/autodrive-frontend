import { useContext } from 'react';
import { useQuery, QueryClientContext } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import type { PermissionCatalogue } from '@/features/staff/types';
import axios from '@/api/axiosInstance';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { accessQueryScope } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { userCan } from '@/lib/permissions';
import type { Course } from '@/features/courses/types';
import type { Group } from '@/features/groups/types';

export type CourseOption = Pick<
  Course,
  | 'id'
  | 'name'
  | 'branch_id'
  | 'course_type'
  | 'price'
  | 'duration_days'
  | 'is_active'
>;
export type GroupOption = Pick<
  Group,
  'id' | 'name' | 'branch_id' | 'course_type' | 'is_active'
> & { branch_name?: string };
export interface WriteOptions {
  branches?: { id: string; name: string }[];
  courses?: CourseOption[];
  groups?: GroupOption[];
  custodians?: { id: string; name: string; role: string }[];
  teachers?: {
    id: string;
    name: string;
    branch_id: string;
    specialization: 'THEORY' | 'PRACTICE';
  }[];
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    branch_id: string;
    total_price?: number;
    amount_paid?: number;
  }[];
  programs?: {
    id: string;
    name: string;
    branch_id: string;
    required_minutes: number;
    category?: string;
  }[];
  stations?: {
    id: string;
    name: string;
    branch_id: string;
    stir?: string | null;
  }[];
  vehicles?: {
    id: string;
    plate_number: string;
    branch_id: string;
    current_custodian_id?: string | null;
    model?: string;
    fuel_types?: string[];
    available_for_booking: boolean;
    categories: string[];
  }[];
  questions?: { id: string; topic: string; visibility: string }[];
  enrollments?: {
    id: string;
    student: { id: string; first_name: string; last_name: string };
    program: { id: string; title: string } | null;
  }[];
}

/** Write lookups are minimal and independently authorized; they never grant read access. */
export const useWriteOptions = (
  resource: string,
  action: 'create' | 'update',
  branchId?: string | null,
  enabled = true,
) => {
  const user = useAuthStore((state) => state.user);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const selectedBranchId =
    branchId ?? activeBranchId ?? user?.branch_ids?.[0] ?? user?.branch_id;
  const scoped = user?.permissions !== undefined;
  const client = useContext(QueryClientContext) ?? queryClient;
  const catalogue = useQuery(
    {
      queryKey: ['permissions', user?.id, user?.access_version],
      enabled: scoped && enabled,
      queryFn: async ({ signal }) =>
        parseItemEnvelope<PermissionCatalogue>(
          (await axios.get('/permissions', { signal })).data,
          'permissions',
        ),
    },
    client,
  );
  const query = useQuery(
    {
      queryKey: [
        'permission-options',
        resource,
        action,
        selectedBranchId,
        ...accessQueryScope(),
      ],
      enabled:
        scoped &&
        enabled &&
        !!selectedBranchId &&
        userCan(user, `${resource}.${action}`, selectedBranchId),
      queryFn: async ({ signal }) =>
        parseItemEnvelope<WriteOptions>(
          (
            await axios.get('/permissions/options', {
              params: { resource, action, branchId: selectedBranchId },
              signal,
            })
          ).data,
          'permission-options',
        ),
    },
    client,
  );
  return {
    ...query,
    scoped,
    branches:
      catalogue.data?.branches.filter((branch) =>
        userCan(user, `${resource}.${action}`, branch.id),
      ) ??
      query.data?.branches ??
      [],
  };
};
