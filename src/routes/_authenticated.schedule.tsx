import { createFileRoute } from '@tanstack/react-router';
import SchedulePage from '@/pages/SchedulePage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

export const Route = createFileRoute('/_authenticated/schedule')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/schedule']),
  component: SchedulePage,
});
