import { AuditLog } from '@/types/audit';

// Client-side sort over the current page of logs (moved verbatim from
// AuditLogPage during decomposition — behavior-preserving).
export function sortAuditLogs(
  logs: AuditLog[],
  sortField: string,
  sortDir: 'asc' | 'desc',
): AuditLog[] {
  return [...logs].sort((a, b) => {
    let va: unknown, vb: unknown;
    if (sortField === 'userName') {
      va = a.user_name || '';
      vb = b.user_name || '';
    } else if (sortField === 'createdAt') {
      va = a.created_at;
      vb = b.created_at;
    } else {
      va = (a as unknown as Record<string, unknown>)[sortField];
      vb = (b as unknown as Record<string, unknown>)[sortField];
    }
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === 'asc'
      ? va < vb
        ? -1
        : va > vb
          ? 1
          : 0
      : va > vb
        ? -1
        : va < vb
          ? 1
          : 0;
  });
}
