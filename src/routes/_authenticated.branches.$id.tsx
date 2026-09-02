import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import BranchDetailPage from '@/pages/BranchDetailPage';
import { branchDetailQueryOptions } from '@/services/branchService';

export const Route = createFileRoute('/_authenticated/branches/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/branches/$id']),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(branchDetailQueryOptions(params.id)),
  component: BranchDetailPage,
});
