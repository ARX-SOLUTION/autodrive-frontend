import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import VehiclesPage from '@/pages/VehiclesPage';

export const Route = createFileRoute('/_authenticated/vehicles/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/vehicles']),
  component: VehiclesPage,
});
