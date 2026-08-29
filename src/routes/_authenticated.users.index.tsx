import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import UsersPage from '@/pages/UsersPage';

export const Route = createFileRoute('/_authenticated/users/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/users']),
  component: UsersPage,
});
