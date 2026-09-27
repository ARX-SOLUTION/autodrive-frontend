import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import DrivingSessionDetailPage from '@/features/driving-sessions/pages/DrivingSessionDetailPage';

export const Route = createFileRoute('/_authenticated/driving-sessions/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/driving-sessions/$id']),
  loader: async ({ context, params }) => {
    const { drivingSessionQueryOptions } =
      await import('@/features/driving-sessions/api/drivingSessionService');
    return context.queryClient.ensureQueryData(
      drivingSessionQueryOptions(params.id),
    );
  },
  component: DrivingSessionDetailPage,
});
