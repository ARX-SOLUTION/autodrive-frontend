import { useAuthStore } from '@/store/authStore';
import { roleCan, isCrossTenantRole, type Capability } from '@/lib/permissions';

/**
 * Subscribe to a single derived permission boolean — NOT the whole user — so a
 * component re-renders only when THIS capability flips
 * (react-best-practices `rerender-derived-state`).
 */
export function useCan(cap: Capability): boolean {
  return useAuthStore((s) => roleCan(s.user?.role, cap));
}

/** owner or dev — the cross-branch roles that see every branch. */
export function useIsCrossTenant(): boolean {
  return useAuthStore((s) => isCrossTenantRole(s.user?.role));
}
