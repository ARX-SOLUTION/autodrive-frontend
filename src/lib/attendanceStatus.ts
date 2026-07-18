import type { AttendanceStatus } from '@/types/attendance';

// Shared status -> Tailwind color classes. Used by StudentDetailPage's
// attendance-history badge.
export const statusColors: Record<AttendanceStatus, string> = {
  present:
    'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
  absent: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  late: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30',
  excused: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
};

// exec-dash 8: semantic-token classes for AttendanceStatusToggle's active
// segment and AttendanceDrawer's status-summary chips (keldi=success,
// kechikdi=warning, kelmadi=destructive, uzrli=info -- Design.md). Kept
// separate from `statusColors` above so StudentDetailPage's badge palette
// stays untouched. Full static strings (not `bg-${tone}`) -- Tailwind's
// scanner only picks up literal class text.
export const statusTone: Record<
  AttendanceStatus,
  { dot: string; text: string; solid: string }
> = {
  present: {
    dot: 'bg-success',
    text: 'text-success',
    solid: 'bg-success text-success-foreground',
  },
  late: {
    dot: 'bg-warning',
    text: 'text-warning',
    solid: 'bg-warning text-warning-foreground',
  },
  absent: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    solid: 'bg-destructive text-destructive-foreground',
  },
  excused: {
    dot: 'bg-info',
    text: 'text-info',
    solid: 'bg-info text-info-foreground',
  },
};
