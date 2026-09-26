import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import PaymentsPage from '@/pages/PaymentsPage';
import {
  parseRouteLimit,
  parseRoutePage,
  type PageSizeOption,
} from '@/lib/listQuery';

export type PaymentsSearch = {
  action?: 'create';
  branch_id?: string;
  course_type?: 'tezkor' | 'avto_maktab';
  date_from?: string;
  date_to?: string;
  limit?: PageSizeOption;
  method?: string;
  page?: number;
  q?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  status?: 'paid' | 'unpaid';
};

export const Route = createFileRoute('/_authenticated/payments')({
  validateSearch: (search: Record<string, unknown>): PaymentsSearch => ({
    action: search.action === 'create' ? ('create' as const) : undefined,
    branch_id:
      typeof search.branch_id === 'string' ? search.branch_id : undefined,
    course_type:
      search.course_type === 'tezkor' || search.course_type === 'avto_maktab'
        ? search.course_type
        : undefined,
    date_from:
      typeof search.date_from === 'string' ? search.date_from : undefined,
    date_to: typeof search.date_to === 'string' ? search.date_to : undefined,
    limit: parseRouteLimit(search.limit),
    method: typeof search.method === 'string' ? search.method : undefined,
    page: parseRoutePage(search.page),
    q: typeof search.q === 'string' ? search.q : undefined,
    sort_by: typeof search.sort_by === 'string' ? search.sort_by : undefined,
    sort_dir:
      search.sort_dir === 'asc' || search.sort_dir === 'desc'
        ? search.sort_dir
        : undefined,
    status:
      search.status === 'paid' || search.status === 'unpaid'
        ? search.status
        : undefined,
  }),
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/payments']),
  component: PaymentsPage,
});
