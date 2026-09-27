import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import Page from '@/features/vehicles/inspections/InspectionsPage';
export const Route = createFileRoute('/_authenticated/vehicle-inspections/')({
  beforeLoad: ({ location }) => requireCapability(location, 'viewInspections'),
  component: Page,
});
