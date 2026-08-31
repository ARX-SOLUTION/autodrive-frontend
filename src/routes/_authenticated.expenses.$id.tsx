import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';

export const Route = createFileRoute('/_authenticated/expenses/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/expenses/$id']),
  component: ExpenseDetailPage,
});
