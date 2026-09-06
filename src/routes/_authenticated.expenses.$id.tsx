import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';

export type ExpenseDetailSearch = {
  tab?: 'payments';
  action?: 'pay_remaining';
  return_attention?: 'overdue';
  return_branch_id?: string;
  return_scope?: 'company';
};

export const validateExpenseDetailSearch = (
  search: Record<string, unknown>,
): ExpenseDetailSearch => {
  const returnAttention =
    search.return_attention === 'overdue' ? 'overdue' : undefined;
  const returnBranchId =
    returnAttention &&
    typeof search.return_branch_id === 'string' &&
    search.return_branch_id.length > 0 &&
    search.return_branch_id.trim() === search.return_branch_id
      ? search.return_branch_id
      : undefined;

  return {
    tab: search.tab === 'payments' ? 'payments' : undefined,
    action: search.action === 'pay_remaining' ? 'pay_remaining' : undefined,
    return_attention: returnAttention,
    return_branch_id: returnBranchId,
    return_scope:
      returnAttention && !returnBranchId && search.return_scope === 'company'
        ? 'company'
        : undefined,
  };
};

export const Route = createFileRoute('/_authenticated/expenses/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/expenses/$id']),
  validateSearch: validateExpenseDetailSearch,
  component: ExpenseDetailPage,
});
