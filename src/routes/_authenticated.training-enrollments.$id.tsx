import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import TrainingEnrollmentDetailPage from '@/pages/TrainingEnrollmentDetailPage';
import { trainingEnrollmentQueryOptions } from '@/services/trainingService';

export const Route = createFileRoute(
  '/_authenticated/training-enrollments/$id',
)({
  beforeLoad: ({ location }) =>
    requireCapability(
      location,
      ROUTE_CAPABILITIES['/training-enrollments/$id'],
    ),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      trainingEnrollmentQueryOptions(params.id),
    ),
  component: TrainingEnrollmentDetailPage,
});
