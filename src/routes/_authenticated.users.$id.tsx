import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import UserDetailPage from '@/pages/UserDetailPage';

export const Route = createFileRoute('/_authenticated/users/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/users/$id']),
  component: UserDetailPage,
});
