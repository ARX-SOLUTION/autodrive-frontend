import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import Page from '@/features/vehicles/fuel/StationsPage';
export const Route = createFileRoute('/_authenticated/fuel-stations/')({
  beforeLoad: ({ location }) => requireCapability(location, 'viewFuel'),
  component: Page,
});
