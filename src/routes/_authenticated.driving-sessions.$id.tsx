import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import DrivingSessionDetailPage from '@/pages/DrivingSessionDetailPage';
import { drivingSessionQueryOptions } from '@/services/drivingSessionService';

export const Route = createFileRoute('/_authenticated/driving-sessions/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/driving-sessions/$id']),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(drivingSessionQueryOptions(params.id)),
  component: DrivingSessionDetailPage,
});
