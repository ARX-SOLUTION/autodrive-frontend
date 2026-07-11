import type { AttendanceStatus } from '@/types/attendance';

// Shared status -> Tailwind color classes. Used by AttendancePage's status
// chip and by AttendanceStatusToggle (autodrive-38m.3) so both surfaces
// render the same color per status.
export const statusColors: Record<AttendanceStatus, string> = {
  present:
    'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
  absent: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  late: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30',
  excused: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
};
