import type { ReactNode } from 'react';
import { useCan } from '@/hooks/useCan';
import type { Capability } from '@/lib/permissions';

/**
 * Render `children` only when the current user has `cap`. Cosmetic gating only
 * — the backend `@Roles` guard is the real boundary. Optional `fallback`
 * renders in place when the capability is absent.
 */
export function RoleGate({
  cap,
  children,
  fallback = null,
}: {
  cap: Capability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{useCan(cap) ? children : fallback}</>;
}
