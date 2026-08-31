import { createFileRoute } from '@tanstack/react-router';
import GroupsPage from '@/pages/GroupsPage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

export const Route = createFileRoute('/_authenticated/groups/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/groups']),
  component: GroupsPage,
});
