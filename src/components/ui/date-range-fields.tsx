/**
 * Callers (planned): StudentsFilterBar, PaymentsFilterBar, AuditFilterBar,
 * CompanyRevenueDashboard FilterBar — replace duplicated Calendar+Popover
 * range wiring and native input[type=date].
 * API: from/to as YYYY-MM-DD strings; onChange(from?, to?) inclusive.
 * Schema: none — UI boundary only; wire stays date_from/date_to query params.
 * User instruction (verbatim): "davom et"
 * Ticket: autodrive-qsgc.4
 */
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { todayCalendarDate } from '@/lib/calendarDate';

export interface DateRangeFieldsProps {
  from?: string;
  to?: string;
  // Inclusive calendar-date bounds as YYYY-MM-DD (or undefined when cleared).
  onChange: (from: string | undefined, to: string | undefined) => void;
  // Inclusive upper bound for both ends (defaults to local today).
  max?: string;
  fromAriaLabel?: string;
  toAriaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Shared inclusive from/to calendar-date fields (autodrive-qsgc.4).
 * Built on DatePicker — never native input[type=date], never Date objects
 * at the boundary.
 */
export const DateRangeFields = ({
  from,
  to,
  onChange,
  max,
  fromAriaLabel,
  toAriaLabel,
  className,
  disabled,
}: DateRangeFieldsProps) => {
  const { t } = useTranslation();
  const effectiveMax = max ?? todayCalendarDate();

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      data-testid="date-range-fields"
    >
      <DatePicker
        value={from}
        max={to && to < effectiveMax ? to : effectiveMax}
        onChange={(nextFrom) => {
          let nextTo = to;
          if (nextFrom && nextTo && nextTo < nextFrom) nextTo = nextFrom;
          onChange(nextFrom, nextTo);
        }}
        disabled={disabled}
        clearable
        placeholder={t('datepicker.placeholder')}
        aria-label={fromAriaLabel ?? t('dashboard.v2.from', 'Dan')}
        className="w-[158px]"
      />
      <span className="text-sm text-muted-foreground" aria-hidden="true">
        →
      </span>
      <DatePicker
        value={to}
        min={from}
        max={effectiveMax}
        onChange={(nextTo) => {
          let nextFrom = from;
          if (nextTo && nextFrom && nextTo < nextFrom) nextFrom = nextTo;
          onChange(nextFrom, nextTo);
        }}
        disabled={disabled}
        clearable
        placeholder={t('datepicker.placeholder')}
        aria-label={toAriaLabel ?? t('dashboard.v2.to', 'Gacha')}
        className="w-[158px]"
      />
    </div>
  );
};

export default DateRangeFields;
