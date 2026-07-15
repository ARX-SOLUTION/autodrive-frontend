/**
 * Central query-key factory for every domain used across src/services/*.ts.
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
 * src/services/*.ts: singular/plural drift (e.g. 'student' vs 'students'
 * for the detail key) and inconsistent 'detail' segment placement.
 *
 * Domains whose queries don't fit list/page/detail (aggregates, sub-
 * resources) get extra named members instead -- see each domain below.
 *
 * This module is additive-only: no existing `queryKey` array in
 * src/services/*.ts is touched. A later stage migrates callers over.
 */

type Filters = Record<string, unknown>;

const baseKeys = <D extends string>(domain: D) => ({
  all: [domain] as const,
  list: (filters: Filters = {}) => [domain, 'list', filters] as const,
  page: (filters: Filters = {}) => [domain, 'page', filters] as const,
  detail: (id: string | number | undefined) => [domain, 'detail', id] as const,
});

export const operatorKeys = baseKeys('operators');
export const userKeys = baseKeys('users');
export const teacherKeys = baseKeys('teachers');
export const studentKeys = baseKeys('students');
export const branchKeys = baseKeys('branches');
export const courseKeys = baseKeys('courses');
export const lessonKeys = baseKeys('lessons');
export const auditLogKeys = baseKeys('audit-logs');

export const groupKeys = {
  ...baseKeys('groups'),
  // Dashboard-style aggregate cards, distinct from the plain group list.
  overview: (filters: Filters = {}) => ['groups', 'overview', filters] as const,
};

export const paymentKeys = {
  ...baseKeys('payments'),
  summary: (filters: Filters = {}) => ['payments', 'summary', filters] as const,
  snapshot: (branchId: string | undefined) =>
    ['payments', 'snapshot', branchId] as const,
  byStudent: (studentId: string | undefined, filters: Filters = {}) =>
    ['payments', 'student', studentId, filters] as const,
};

export const attendanceKeys = {
  all: ['attendance'] as const,
  history: (studentId: string | undefined, filters: Filters = {}) =>
    ['attendance', 'history', studentId, filters] as const,
};

export const scheduleKeys = {
  all: ['schedule'] as const,
  templates: (filters: Filters = {}) =>
    ['schedule', 'templates', filters] as const,
  calendar: (filters: Filters = {}) =>
    ['schedule', 'calendar', filters] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  analytics: (filters: Filters = {}) =>
    ['dashboard', 'analytics', filters] as const,
  teacherAnalytics: () => ['dashboard', 'teacher-analytics'] as const,
  company: (filters: Filters = {}) =>
    ['dashboard', 'company', filters] as const,
};

export const examKeys = {
  all: ['exams'] as const,
  byStudent: (studentId: string | undefined) =>
    ['exams', 'student', studentId] as const,
};

export const blogKeys = {
  all: ['blog'] as const,
  list: (filters: Filters = {}) => ['blog', 'list', filters] as const,
  detail: (slug: string | undefined) => ['blog', 'detail', slug] as const,
};

export const searchKeys = {
  all: ['search'] as const,
  query: (term: string) => ['search', 'query', term] as const,
};

export const authKeys = {
  all: ['auth'] as const,
  me: () => ['auth', 'me'] as const,
};

export const telegramKeys = {
  all: ['telegram'] as const,
  linkStatus: () => ['telegram', 'link-status'] as const,
};
