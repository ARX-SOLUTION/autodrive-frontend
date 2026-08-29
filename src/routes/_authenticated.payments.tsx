import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import PaymentsPage from '@/pages/PaymentsPage';

export const Route = createFileRoute('/_authenticated/payments')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/payments']),
  component: PaymentsPage,
});
