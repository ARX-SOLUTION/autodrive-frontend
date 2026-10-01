import { useAuthStore } from '@/store/authStore';
import {
  userCan,
  isCompanyWideRole,
  isCrossTenantRole,
  type AccessCapability,
} from '@/lib/permissions';

/**
 * Subscribe to a single derived permission boolean — NOT the whole user — so a
 * component re-renders only when THIS capability flips
 * (react-best-practices `rerender-derived-state`).
 */
export function useCan(
  cap: AccessCapability,
  branchId?: string | null,
): boolean {
  return useAuthStore((s) =>
    userCan(s.user, cap, branchId === undefined ? s.activeBranchId : branchId),
  );
}

/** owner or dev — the cross-branch roles that see every branch. */
export function useIsCrossTenant(): boolean {
  return useAuthStore((s) => isCrossTenantRole(s.user?.role));
}

/** May query company-wide data without a branch filter. */
export function useIsCompanyWide(): boolean {
  return useAuthStore((s) => isCompanyWideRole(s.user?.role));
}

/** Delegating permissions is independent of the actor's execution grants. */
export function useCanManageStaffAccess(): boolean {
  return useAuthStore(
    (state) =>
      state.user?.role === 'owner' || !!state.user?.delegations?.length,
  );
}
