import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import MySettlementsPage from '@/pages/MySettlementsPage';

export const Route = createFileRoute('/_authenticated/my-settlements/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/my-settlements']),
  component: MySettlementsPage,
});
