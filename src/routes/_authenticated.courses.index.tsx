import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import CoursesPage from '@/pages/CoursesPage';

export const Route = createFileRoute('/_authenticated/courses/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/courses']),
  component: CoursesPage,
});
