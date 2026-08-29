import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import TeachersPage from '@/pages/TeachersPage';

export const Route = createFileRoute('/_authenticated/teachers')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/teachers']),
  component: TeachersPage,
});
