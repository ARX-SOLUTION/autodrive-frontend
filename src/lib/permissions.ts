import type { UserRole } from '@/types/user';

/**
 * Capability → allowed roles: the single source of truth for what each role
 * can see/do in the UI.
 *
 * FE gating is COSMETIC — the backend `@Roles` guards are the real security
 * boundary, so every capability here should have a matching server-side guard.
 * `dev` is a strict SUPERSET of `owner` (the admin-panel's acting role is
 * always dev, so an owner-only gate would hide owner controls from dev).
 * Confirmed with the product owner — see bd autodrive-6ef.2.
 */
export type Capability =
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
  | 'viewAudit'
  | 'viewDashboard';

// Role groups — named so the matrix reads as intent, not a wall of literals.
const OWNERS: readonly UserRole[] = ['dev', 'owner'];
const OPS: readonly UserRole[] = ['dev', 'owner', 'manager', 'operator'];
const ALL: readonly UserRole[] = [
  'dev',
  'owner',
  'manager',
  'operator',
  'teacher',
];

export const CAPABILITIES: Record<Capability, readonly UserRole[]> = {
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
  takeAttendance: ALL,
  viewAudit: OWNERS,
  viewDashboard: ALL,
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
