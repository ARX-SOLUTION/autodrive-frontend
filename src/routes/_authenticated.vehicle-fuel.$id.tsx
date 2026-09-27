import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import Page from '@/features/vehicles/fuel/FuelDetailPage';
export const Route = createFileRoute('/_authenticated/vehicle-fuel/$id')({
  beforeLoad: ({ location }) => requireCapability(location, 'viewFuel'),
  component: Page,
});
