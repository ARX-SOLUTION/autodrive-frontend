import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';

export type ExpenseDetailSearch = {
  tab?: 'payments';
  action?: 'pay_remaining';
};

export const validateExpenseDetailSearch = (
  search: Record<string, unknown>,
): ExpenseDetailSearch => ({
  tab: search.tab === 'payments' ? 'payments' : undefined,
  action: search.action === 'pay_remaining' ? 'pay_remaining' : undefined,
});

export const Route = createFileRoute('/_authenticated/expenses/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/expenses/$id']),
  validateSearch: validateExpenseDetailSearch,
  component: ExpenseDetailPage,
});
