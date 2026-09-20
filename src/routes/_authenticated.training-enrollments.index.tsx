import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import TrainingEnrollmentsPage from '@/pages/TrainingEnrollmentsPage';

export const Route = createFileRoute('/_authenticated/training-enrollments/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/training-enrollments']),
  component: TrainingEnrollmentsPage,
});
