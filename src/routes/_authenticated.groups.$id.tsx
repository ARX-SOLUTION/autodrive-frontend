import { createFileRoute } from '@tanstack/react-router';
import GroupDetailPage from '@/pages/GroupDetailPage';
import { groupDetailQueryOptions } from '@/services/groupService';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

export const Route = createFileRoute('/_authenticated/groups/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/groups/$id']),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(groupDetailQueryOptions(params.id)),
  component: GroupDetailPage,
});
