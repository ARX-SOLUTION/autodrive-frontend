import { createFileRoute } from '@tanstack/react-router';
import LeadsPage from '@/features/leads/pages/LeadsPage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import {
  parseRouteLimit,
  parseRoutePage,
  type PageSizeOption,
} from '@/lib/listQuery';
import type {
  LeadSource,
  CourseType,
  Category,
} from '@/features/leads/types/leads.types';

type LeadsSearch = {
  action?: 'create';
  branch_id?: string;
  stage_id?: string;
  source?: LeadSource;
  course_type?: CourseType;
  category?: Category;
  assigned_to_me?: boolean;
  assignee_user_id?: string;
  overdue_only?: boolean;
  has_task?: boolean;
  period?: '7d' | '30d' | '60d' | 'all';
  tab?: 'new' | 'in_progress' | 'won' | 'lost' | 'all';
  view?: 'board' | 'list' | 'metrics';
  limit?: PageSizeOption;
  page?: number;
  q?: string;
};

export const Route = createFileRoute('/_authenticated/leads/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/leads']),
  validateSearch: (search: Record<string, unknown>): LeadsSearch => ({
    action: search.action === 'create' ? ('create' as const) : undefined,
    branch_id:
      typeof search.branch_id === 'string' ? search.branch_id : undefined,
    stage_id: typeof search.stage_id === 'string' ? search.stage_id : undefined,
    source:
      typeof search.source === 'string'
        ? (search.source as LeadSource)
        : undefined,
    course_type:
      search.course_type === 'tezkor' || search.course_type === 'avto_maktab'
        ? search.course_type
        : undefined,
    category:
      typeof search.category === 'string'
        ? (search.category as Category)
        : undefined,
    assigned_to_me:
      search.assigned_to_me === 'true' || search.assigned_to_me === true
        ? true
        : undefined,
    assignee_user_id:
      typeof search.assignee_user_id === 'string'
        ? search.assignee_user_id
        : undefined,
    overdue_only:
      search.overdue_only === 'true' || search.overdue_only === true
        ? true
        : undefined,
    has_task:
      search.has_task === 'true' || search.has_task === true ? true : undefined,
    period:
      search.period === '7d' ||
      search.period === '30d' ||
      search.period === '60d' ||
      search.period === 'all'
        ? search.period
        : undefined,
    tab:
      search.tab === 'new' ||
      search.tab === 'in_progress' ||
      search.tab === 'won' ||
      search.tab === 'lost' ||
      search.tab === 'all'
        ? search.tab
        : undefined,
    view:
      search.view === 'board' ||
      search.view === 'list' ||
      search.view === 'metrics'
        ? search.view
        : undefined,
    limit: parseRouteLimit(search.limit),
    page: parseRoutePage(search.page),
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: LeadsPage,
});
