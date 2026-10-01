import { useAuthStore } from '@/store/authStore';

/**
 * Central query-key factory for every domain used across feature API modules.
 *
 * Convention chosen: one named export per domain (`studentKeys`,
 * `paymentKeys`, ...), each an object of key-builder functions -- not a
 * single combined `queryKeys.students.list(...)` object. Rationale: Stage 2
 * migrates one service file at a time, so a direct
 * `import { studentKeys } from '@/lib/queryKeys'` per file reads cleaner
 * than importing one big nested object and indexing into it everywhere.
 *
 * Base shape (most domains):
 *   xKeys.all            -> ['<domain>']
 *   xKeys.list(filters?) -> ['<domain>', 'list', filters]    non-paginated fetch
 *   xKeys.page(filters?) -> ['<domain>', 'page', filters]    server-paginated fetch
 *   xKeys.detail(id)     -> ['<domain>', 'detail', id]       single item
 *
 * `filters` is always ONE object (never a flat scalar tuple), so adding or
 * reordering filter fields never shifts argument position and cache
 * entries keep matching. This also fixes existing inconsistencies found in
 * feature API modules: singular/plural drift (e.g. 'student' vs 'students'
 * for the detail key) and inconsistent 'detail' segment placement.
 *
 * Domains whose queries don't fit list/page/detail (aggregates, sub-
 * resources) get extra named members instead -- see each domain below.
 *
 * Services should use these factories for every query key and invalidation;
 * this keeps cache identity stable across route loaders and feature hooks.
 */

type Filters = Record<string, unknown>;

export const accessQueryScope = () => {
  const state = useAuthStore.getState?.();
  const user = state?.user;
  if (user?.permissions === undefined && user?.access_version === undefined)
    return [] as const;
  return [
    {
      userId: user?.id,
      companyId: user?.company_id,
      branchId: state?.activeBranchId,
      accessVersion: user?.access_version,
    },
  ] as const;
};

const baseKeys = <D extends string>(domain: D) => ({
  all: [domain] as const,
  list: (filters: Filters = {}) =>
    [domain, 'list', filters, ...accessQueryScope()] as const,
  page: (filters: Filters = {}) =>
    [domain, 'page', filters, ...accessQueryScope()] as const,
  detail: (id: string | number | undefined) =>
    [domain, 'detail', id, ...accessQueryScope()] as const,
});

export const operatorKeys = baseKeys('operators');
export const userKeys = baseKeys('users');
export const teacherKeys = baseKeys('teachers');
export const studentKeys = baseKeys('students');
export const branchKeys = baseKeys('branches');
export const vehicleKeys = baseKeys('vehicles');
export const trainingProgramKeys = baseKeys('training-programs');
export const trainingEnrollmentKeys = baseKeys('training-enrollments');
export const drivingSessionKeys = {
  ...baseKeys('driving-sessions'),
  summary: (enrollmentId: string) =>
    [
      'driving-sessions',
      'summary',
      enrollmentId,
      ...accessQueryScope(),
    ] as const,
  report: (enrollmentId: string) =>
    [
      'driving-sessions',
      'report',
      enrollmentId,
      ...accessQueryScope(),
    ] as const,
};
export const courseKeys = baseKeys('courses');
export const lessonKeys = baseKeys('lessons');
export const auditLogKeys = baseKeys('audit-logs');
export const leadKeys = {
  ...baseKeys('leads'),
  board: (filters: Filters = {}) =>
    ['leads', 'board', filters, ...accessQueryScope()] as const,
  metrics: (filters: Filters = {}) =>
    ['leads', 'metrics', filters, ...accessQueryScope()] as const,
  activities: (leadId: string) =>
    ['leads', 'activities', leadId, ...accessQueryScope()] as const,
  stages: () => ['leads', 'stages', ...accessQueryScope()] as const,
  sources: () => ['leads', 'sources', ...accessQueryScope()] as const,
};

export const groupKeys = {
  ...baseKeys('groups'),
  // Dashboard-style aggregate cards, distinct from the plain group list.
  overview: (filters: Filters = {}) =>
    ['groups', 'overview', filters, ...accessQueryScope()] as const,
};

export const paymentKeys = {
  ...baseKeys('payments'),
  summary: (filters: Filters = {}) =>
    ['payments', 'summary', filters, ...accessQueryScope()] as const,
  snapshot: (branchId: string | undefined) =>
    ['payments', 'snapshot', branchId, ...accessQueryScope()] as const,
  byStudent: (studentId: string | undefined, filters: Filters = {}) =>
    ['payments', 'student', studentId, filters, ...accessQueryScope()] as const,
};

export const expenseKeys = {
  ...baseKeys('expenses'),
  branchOptions: (companyId: string | undefined) =>
    ['expenses', 'branch-options', companyId, ...accessQueryScope()] as const,
  vehicleOptions: (filters: Filters = {}) =>
    ['expenses', 'vehicle-options', filters, ...accessQueryScope()] as const,
  teacherOptions: (companyId: string | undefined) =>
    ['expenses', 'teacher-options', companyId, ...accessQueryScope()] as const,
  triageCounts: (filters: Filters = {}) =>
    ['expenses', 'triage-counts', filters, ...accessQueryScope()] as const,
  overdueSweep: (filters: Filters = {}) =>
    ['expenses', 'overdue-sweep', filters, ...accessQueryScope()] as const,
  deletedHistory: (filters: Filters = {}) =>
    ['expenses', 'history', 'deleted', filters, ...accessQueryScope()] as const,
};

/** Teacher self-view (`GET /teacher-settlements/me`) — invalidated on settlement create. */
export const teacherSettlementKeys = {
  all: ['teacher-settlements'] as const,
  me: (page = 1, limit = 10) =>
    [
      'teacher-settlements',
      'me',
      { page, limit },
      ...accessQueryScope(),
    ] as const,
  meDetail: (id: string | number | undefined) =>
    ['teacher-settlements', 'me', 'detail', id, ...accessQueryScope()] as const,
};

export const attendanceKeys = {
  all: ['attendance'] as const,
  history: (studentId: string | undefined, filters: Filters = {}) =>
    [
      'attendance',
      'history',
      studentId,
      filters,
      ...accessQueryScope(),
    ] as const,
};

export const scheduleKeys = {
  all: ['schedule'] as const,
  templates: (filters: Filters = {}) =>
    ['schedule', 'templates', filters, ...accessQueryScope()] as const,
  calendar: (filters: Filters = {}) =>
    ['schedule', 'calendar', filters, ...accessQueryScope()] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  analytics: (filters: Filters = {}) =>
    ['dashboard', 'analytics', filters, ...accessQueryScope()] as const,
  teacherAnalytics: () =>
    ['dashboard', 'teacher-analytics', ...accessQueryScope()] as const,
  company: (filters: Filters = {}) =>
    ['dashboard', 'company', filters, ...accessQueryScope()] as const,
  financeSummary: (filters: Filters = {}) =>
    ['dashboard', 'finance-summary', filters, ...accessQueryScope()] as const,
  expenseBreakdown: (filters: Filters = {}) =>
    ['dashboard', 'expense-breakdown', filters, ...accessQueryScope()] as const,
};

export const examKeys = {
  all: ['exams'] as const,
  byStudent: (studentId: string | undefined) =>
    ['exams', 'student', studentId, ...accessQueryScope()] as const,
};

export const searchKeys = {
  all: ['search'] as const,
  query: (term: string) =>
    ['search', 'query', term, ...accessQueryScope()] as const,
};

export const authKeys = {
  all: ['auth'] as const,
  me: () => ['auth', 'me'] as const,
};

export const telegramKeys = {
  all: ['telegram'] as const,
  linkStatus: () => ['telegram', 'link-status', ...accessQueryScope()] as const,
};

export const questionKeys = {
  ...baseKeys('questions'),
  availableForTests: (filters: Filters = {}) =>
    [
      'questions',
      'available-for-tests',
      filters,
      ...accessQueryScope(),
    ] as const,
};

export const schoolTestKeys = {
  ...baseKeys('school-tests'),
  assignments: (templateId: string | undefined) =>
    ['school-tests', 'assignments', templateId, ...accessQueryScope()] as const,
};
