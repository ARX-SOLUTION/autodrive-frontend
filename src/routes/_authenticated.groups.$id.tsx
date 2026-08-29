import { createFileRoute } from '@tanstack/react-router';
import GroupDetailPage from '@/pages/GroupDetailPage';
import { groupDetailQueryOptions } from '@/services/groupService';

export const Route = createFileRoute('/_authenticated/groups/$id')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(groupDetailQueryOptions(params.id)),
  component: GroupDetailPage,
});
