import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import ExpensesPage from '@/pages/ExpensesPage';
import type { ExpenseCategory, ExpenseStatus } from '@/types/expense';

export type ExpensesSearch = {
  branch_id?: string;
  scope?: 'company';
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
};

const categories: ExpenseCategory[] = [
  'rent',
  'utilities',
  'vehicle',
  'marketing',
  'supplies',
  'administrative',
  'other',
];
const statuses: ExpenseStatus[] = [
  'planned',
  'partially_paid',
  'paid',
  'cancelled',
];

export const Route = createFileRoute('/_authenticated/expenses/')({
  validateSearch: (search: Record<string, unknown>): ExpensesSearch => ({
    branch_id:
      typeof search.branch_id === 'string' ? search.branch_id : undefined,
    scope: search.scope === 'company' ? 'company' : undefined,
    category: categories.includes(search.category as ExpenseCategory)
      ? (search.category as ExpenseCategory)
      : undefined,
    status: statuses.includes(search.status as ExpenseStatus)
      ? (search.status as ExpenseStatus)
      : undefined,
    date_from:
      typeof search.date_from === 'string' ? search.date_from : undefined,
    date_to: typeof search.date_to === 'string' ? search.date_to : undefined,
    page:
      typeof search.page === 'number' && Number.isFinite(search.page)
        ? search.page
        : undefined,
  }),
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/expenses']),
  component: ExpensesPage,
});
