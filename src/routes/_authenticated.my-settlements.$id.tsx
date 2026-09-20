import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';

export const Route = createFileRoute('/_authenticated/my-settlements/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/my-settlements/$id']),
  component: ExpenseDetailPage,
});
