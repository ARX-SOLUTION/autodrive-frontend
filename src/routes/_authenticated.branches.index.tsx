import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import BranchesPage from '@/pages/BranchesPage';

export const Route = createFileRoute('/_authenticated/branches/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/branches']),
  component: BranchesPage,
});
