import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import BranchDetailPage from '@/pages/BranchDetailPage';

export const Route = createFileRoute('/_authenticated/branches/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/branches/$id']),
  loader: async ({ context, params }) => {
    const { branchDetailQueryOptions } =
      await import('@/services/branchService');
    return context.queryClient.ensureQueryData(
      branchDetailQueryOptions(params.id),
    );
  },
  component: BranchDetailPage,
});
