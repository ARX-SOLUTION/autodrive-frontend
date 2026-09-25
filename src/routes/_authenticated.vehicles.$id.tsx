import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import VehicleDetailPage from '@/pages/VehicleDetailPage';

export const Route = createFileRoute('/_authenticated/vehicles/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/vehicles/$id']),
  loader: async ({ context, params }) => {
    const { vehicleDetailQueryOptions } =
      await import('@/services/vehicleService');
    return context.queryClient.ensureQueryData(
      vehicleDetailQueryOptions(params.id),
    );
  },
  component: VehicleDetailPage,
});
