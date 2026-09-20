import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import DrivingSessionsPage from '@/pages/DrivingSessionsPage';

export const Route = createFileRoute('/_authenticated/driving-sessions/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/driving-sessions']),
  component: DrivingSessionsPage,
});
