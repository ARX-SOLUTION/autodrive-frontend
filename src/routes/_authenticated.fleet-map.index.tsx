import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import FleetMapPage from '@/pages/FleetMapPage';

export const Route = createFileRoute('/_authenticated/fleet-map/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/fleet-map']),
  component: FleetMapPage,
});
