import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import TrainingEnrollmentDetailPage from '@/pages/TrainingEnrollmentDetailPage';

export const Route = createFileRoute(
  '/_authenticated/training-enrollments/$id',
)({
  beforeLoad: ({ location }) =>
    requireCapability(
      location,
      ROUTE_CAPABILITIES['/training-enrollments/$id'],
    ),
  loader: async ({ context, params }) => {
    const { trainingEnrollmentQueryOptions } =
      await import('@/services/trainingService');
    return context.queryClient.ensureQueryData(
      trainingEnrollmentQueryOptions(params.id),
    );
  },
  component: TrainingEnrollmentDetailPage,
});
