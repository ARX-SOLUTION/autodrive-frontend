import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { userCan } from '@/lib/permissions';

const READ_RESOURCE: Record<string, string> = {
  users: 'staff',
  teachers: 'staff',
  operators: 'staff',
  students: 'students',
  branches: 'branches',
  groups: 'groups',
  courses: 'courses',
  lessons: 'lessons',
  attendance: 'attendance',
  schedule: 'schedule',
  payments: 'payments',
  expenses: 'expenses',
  'teacher-settlements': 'expenses',
  vehicles: 'vehicles',
  'vehicle-fuel': 'fuel',
  'vehicle-inspections': 'vehicle_inspections',
  'fuel-stations': 'fuel_stations',
  'training-programs': 'training_programs',
  'training-enrollments': 'training_enrollments',
  'driving-sessions': 'driving_sessions',
  questions: 'questions',
  'school-tests': 'test_templates',
  exams: 'exams',
  leads: 'leads',
  'audit-logs': 'audit',
  dashboard: 'reports',
};

export const permissionForReadQuery = (
  key: QueryKey,
): `${string}.${string}` | undefined => {
  const domain = typeof key[0] === 'string' ? key[0] : '';
  // Access management and the authenticated catalogue have their own server gates.
  if (domain === 'users' && key.at(-1) === 'access') return undefined;
  if (domain === 'vehicle-fuel' && key.includes('vehicles'))
    return 'fuel.create';
  if (domain === 'vehicle-inspections' && key.includes('receivers'))
    return 'vehicle_inspections.create';
  const resource =
    domain === 'school-tests' && key[1] === 'assignments'
      ? 'test_assignments'
      : domain === 'leads' && key[1] === 'stages'
        ? 'lead_stages'
        : domain === 'vehicle-fuel' && key.includes('vehicles')
          ? 'vehicles'
          : domain === 'vehicle-inspections' && key.includes('defects')
            ? 'vehicle_defects'
            : READ_RESOURCE[domain];
  return resource ? `${resource}.read` : undefined;
};

/** Keep every query's own enabled condition, while requiring explicit read access. */
export const usePermissionQuery = ((options, client) => {
  const user = useAuthStore((state) => state.user);
  const branchId = useAuthStore((state) => state.activeBranchId);
  const permission = permissionForReadQuery(options.queryKey);
  const allowed =
    user?.permissions === undefined ||
    !permission ||
    userCan(user, permission, branchId);
  const enabled = options.enabled;
  return useTanStackQuery(
    {
      ...options,
      enabled:
        typeof enabled === 'function'
          ? (query) => allowed && enabled(query)
          : allowed && enabled !== false,
    },
    client,
  );
}) as typeof useTanStackQuery;
