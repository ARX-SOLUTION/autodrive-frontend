import { createFileRoute } from '@tanstack/react-router';
import StudentsPage from '@/pages/StudentsPage';

type StudentListSearch = {
  action?: 'create';
  branch_id?: string;
  course_type?: 'tezkor' | 'avto_maktab';
  date_from?: string;
  date_to?: string;
  has_debt?: boolean;
  has_group?: boolean;
  include_deleted?: boolean;
  operator_id?: string;
  q?: string;
  referred_by_student_id?: string;
  referred_by_user_id?: string;
  status?: 'active' | 'completed' | 'dropped' | 'suspended';
};

export const Route = createFileRoute('/_authenticated/students/')({
  validateSearch: (search: Record<string, unknown>): StudentListSearch => ({
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
    has_debt:
      search.has_debt === 'true' || search.has_debt === true ? true : undefined,
    has_group:
      search.has_group === 'true' || search.has_group === true
        ? true
        : undefined,
    include_deleted:
      search.include_deleted === 'true' || search.include_deleted === true
        ? true
        : undefined,
    operator_id:
      typeof search.operator_id === 'string' ? search.operator_id : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
    referred_by_student_id:
      typeof search.referred_by_student_id === 'string'
        ? search.referred_by_student_id
        : undefined,
    referred_by_user_id:
      typeof search.referred_by_user_id === 'string'
        ? search.referred_by_user_id
        : undefined,
    status:
      search.status === 'active' ||
      search.status === 'completed' ||
      search.status === 'dropped' ||
      search.status === 'suspended'
        ? search.status
        : undefined,
  }),
  component: StudentsPage,
});
