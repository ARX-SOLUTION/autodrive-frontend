import type { UserRole } from '@/types/user';

/**
 * Capability → allowed roles: the single source of truth for what each role
 * can see/do in the UI.
 *
 * FE gating is COSMETIC — the backend `@Roles` guards are the real security
 * boundary, so every capability here should have a matching server-side guard.
 * `dev` is a superset of `owner` for operational capabilities. Finance is an
 * explicit exception: direct dev sessions never receive company-finance
 * capabilities; an effective impersonated owner is checked as `owner`.
 */
export type Capability =
  | 'accessOperations'
  | 'viewAllBranches'
  | 'manageBranches'
  | 'assignBranch'
  | 'manageStaff'
  | 'manageUsers'
  | 'recordPayment'
  | 'manageStudents'
  | 'manageGroups'
  | 'manageSchedule'
  | 'takeAttendance'
  | 'manageOwnLesson'
  | 'viewAudit'
  | 'viewDashboard'
  | 'viewExpenses'
  | 'manageCompanyFinance'
  | 'viewDeleted';

// Role groups — named so the matrix reads as intent, not a wall of literals.
const OWNERS: readonly UserRole[] = ['dev', 'owner'];
const OPS: readonly UserRole[] = ['dev', 'owner', 'manager', 'operator'];
// Accountant stays permanently outside operational capabilities. Finance
// access is granted separately through staged finance-only capabilities.
const OPERATIONAL_ROLES: readonly UserRole[] = [
  'dev',
  'owner',
  'manager',
  'operator',
  'teacher',
];

export const CAPABILITIES: Record<Capability, readonly UserRole[]> = {
  accessOperations: OPERATIONAL_ROLES,
  viewAllBranches: OWNERS,
  manageBranches: OWNERS,
  assignBranch: OWNERS,
  manageStaff: ['dev', 'owner', 'manager'],
  // Company user administration (creating managers) — owner/dev only, unlike
  // manageStaff (adding branch teachers/operators, which a manager may do).
  manageUsers: OWNERS,
  recordPayment: OPS,
  manageStudents: OPS,
  manageGroups: OPS,
  manageSchedule: OPS,
  takeAttendance: OPERATIONAL_ROLES,
  // Teacher creates an ad-hoc lesson for their own (server-scoped) group and
  // edits/deletes only lessons they personally created -- narrower than
  // manageSchedule (templates/bulk-generate stay OPS-only, unaffected).
  // Deliberately excludes operator: operator already creates lessons via
  // manageSchedule, but must not get a delete-own affordance the backend
  // won't honor (DELETE /lessons/:id stays owner/manager, + the creator only
  // if teacher). dev/owner/manager included to satisfy dev/owner ⊇ every
  // capability (permissions.test.ts) -- harmless, since owner/manager already
  // have unconditional delete via the role check in AttendancePage.
  manageOwnLesson: ['dev', 'owner', 'manager', 'teacher'],
  viewAudit: OWNERS,
  viewDashboard: OPERATIONAL_ROLES,
  // Finance is intentionally not part of the dev superset. Direct platform
  // sessions are denied by the backend; an impersonated owner is evaluated
  // with the effective owner role instead.
  viewExpenses: ['owner', 'accountant', 'manager'],
  manageCompanyFinance: ['owner', 'accountant'],
  // autodrive-cg9: "show deleted" toggle + restore action on the students/
  // groups/users/branches list pages. No existing capability means this --
  // manageBranches/manageUsers/manageStudents/manageGroups are each scoped
  // to ONE entity's CRUD, and viewAudit/viewAllBranches/assignBranch each
  // already gate a different, unrelated feature. A dedicated OWNERS-only
  // capability keeps `useCan('viewDeleted')` self-documenting at each of
  // the four call sites instead of overloading an unrelated one.
  viewDeleted: OWNERS,
};

/** Does this role have the capability? An absent/unknown role has none. */
export function roleCan(
  role: UserRole | undefined | null,
  cap: Capability,
): boolean {
  return role != null && CAPABILITIES[cap].includes(role);
}

/** owner or dev — the cross-branch (company-wide) roles. */
export function isCrossTenantRole(role: UserRole | undefined | null): boolean {
  return role === 'owner' || role === 'dev';
}
