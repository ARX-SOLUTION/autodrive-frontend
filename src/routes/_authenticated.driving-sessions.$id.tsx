import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import DrivingSessionDetailPage from '@/pages/DrivingSessionDetailPage';

export const Route = createFileRoute('/_authenticated/driving-sessions/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/driving-sessions/$id']),
  loader: async ({ context, params }) => {
    const { drivingSessionQueryOptions } =
      await import('@/services/drivingSessionService');
    return context.queryClient.ensureQueryData(
      drivingSessionQueryOptions(params.id),
    );
  },
  component: DrivingSessionDetailPage,
});
