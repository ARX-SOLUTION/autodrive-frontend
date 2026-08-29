import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import OperatorsPage from '@/pages/OperatorsPage';

export const Route = createFileRoute('/_authenticated/operators')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/operators']),
  component: OperatorsPage,
});
