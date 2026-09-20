import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import TrainingProgramsPage from '@/pages/TrainingProgramsPage';

export const Route = createFileRoute('/_authenticated/training-programs/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/training-programs']),
  component: TrainingProgramsPage,
});
