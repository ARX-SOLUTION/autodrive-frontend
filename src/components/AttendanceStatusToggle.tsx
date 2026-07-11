import { useTranslation } from 'react-i18next';
import { AttendanceStatus } from '@/types/attendance';
import { statusColors } from '@/lib/attendanceStatus';
import { cn } from '@/lib/utils';

const TOGGLE_STATUSES = ['present', 'late', 'absent'] as const;

interface AttendanceStatusToggleProps {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  className?: string;
}

// One-click 3-way toggle (Keldi/Kech/Yo'q) replacing the per-row Select
// dropdown (autodrive-38m.3). Shared by AttendancePage and AttendanceDrawer
// so both surfaces mark attendance the same way. 'excused' has no button --
// it's legacy-only and simply shows no button highlighted.
const AttendanceStatusToggle = ({
  value,
  onChange,
  className,
}: AttendanceStatusToggleProps) => {
  const { t } = useTranslation();
  const labels: Record<(typeof TOGGLE_STATUSES)[number], string> = {
    present: t('attendance.toggle_present'),
    late: t('attendance.toggle_late'),
    absent: t('attendance.toggle_absent'),
  };

  return (
    <div
      className={cn(
        'inline-flex divide-x divide-border overflow-hidden rounded-lg border',
        className,
      )}
    >
      {TOGGLE_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          aria-pressed={value === status}
          className={cn(
            'min-h-11 min-w-[44px] px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150',
            value === status
              ? statusColors[status]
              : 'text-muted-foreground hover:bg-accent',
          )}
        >
          {labels[status]}
        </button>
      ))}
    </div>
  );
};

export default AttendanceStatusToggle;
