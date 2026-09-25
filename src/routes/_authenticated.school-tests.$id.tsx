import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import SchoolTestDetailPage from '@/pages/SchoolTestDetailPage';

export const Route = createFileRoute('/_authenticated/school-tests/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/school-tests/$id']),
  component: SchoolTestDetailPage,
});
