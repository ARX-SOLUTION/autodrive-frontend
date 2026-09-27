import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import SchoolTestsPage from '@/features/school-tests/pages/SchoolTestsPage';

export const Route = createFileRoute('/_authenticated/school-tests/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/school-tests']),
  component: SchoolTestsPage,
});
