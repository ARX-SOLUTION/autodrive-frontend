import { useTranslation } from 'react-i18next';
import { AttendanceStatus } from '@/features/attendance/types';
import { statusTone } from '@/lib/attendanceStatus';
import { cn } from '@/lib/utils';

const TOGGLE_STATUSES = ['present', 'late', 'absent'] as const;

interface AttendanceStatusToggleProps {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  studentName?: string;
  className?: string;
}

// One-click 3-way toggle (Keldi/Kech/Yo'q) replacing the per-row Select
// dropdown (autodrive-38m.3). Shared by AttendancePage and AttendanceDrawer
// so both surfaces mark attendance the same way. 'excused' has no button --
// it's legacy-only and simply shows no segment highlighted. exec-dash 8:
// restyled to the mock's segmented row (solid status color when active);
// same 3-status props contract.
const AttendanceStatusToggle = ({
  value,
  onChange,
  studentName,
  className,
}: AttendanceStatusToggleProps) => {
  const { t } = useTranslation();
  const labels: Record<(typeof TOGGLE_STATUSES)[number], string> = {
    present: t('attendance.toggle_present'),
    late: t('attendance.toggle_late'),
    absent: t('attendance.toggle_absent'),
  };

  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2', className)}>
      {TOGGLE_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          aria-pressed={value === status}
          aria-label={`${labels[status]} - ${studentName || ''}`}
          className={cn(
            'h-9 min-h-9 min-w-[58px] sm:min-w-[68px] px-2 sm:px-2.5 text-xs font-medium rounded-lg motion-safe:transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            value === status
              ? statusTone[status].solid
              : 'border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          {labels[status]}
        </button>
      ))}
    </div>
  );
};

export default AttendanceStatusToggle;
