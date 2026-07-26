/**
 * Callers: StudentsFilterBar, PaymentsFilterBar, AuditFilterBar,
 * CompanyRevenueDashboard FilterBar — replaces DateRangeFields (deleted).
 * API: from/to YYYY-MM-DD; onChange(from?, to?) only on full inclusive range
 * or clear(undefined, undefined). Default max = Tashkent today.
 * Schema: none — UI boundary; wire stays date_from/date_to.
 * User instruction (verbatim): "A" (shared understanding → implement
 * single DateRangePicker with range calendar).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from '@phosphor-icons/react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  formatCalendarDate,
  parseCalendarDate,
  type CalendarDateLocale,
} from '@/lib/calendarDate';
import { tashkentTodayCalendarDate } from '@/lib/tashkentDate';

export interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
  max?: string;
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
}

const DAY_MS = 86_400_000;

const startOfLocalDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const clampToMax = (date: Date, maxDate: Date | undefined) =>
  maxDate && date > maxDate ? maxDate : date;

/** Move the nearer end of an existing range; ties prefer `to`. */
export const moveNearestEnd = (
  from: Date,
  to: Date,
  clicked: Date,
): { from: Date; to: Date } => {
  const click = startOfLocalDay(clicked);
  const a = startOfLocalDay(from);
  const b = startOfLocalDay(to);
  const distFrom = Math.abs(click.getTime() - a.getTime()) / DAY_MS;
  const distTo = Math.abs(click.getTime() - b.getTime()) / DAY_MS;
  if (distFrom < distTo) {
    if (click > b) return { from: b, to: click };
    return { from: click, to: b };
  }
  if (click < a) return { from: click, to: a };
  return { from: a, to: click };
};

export const formatRangeLabel = (
  from: Date,
  to: Date,
  locale: CalendarDateLocale,
): string => {
  const sameMonth =
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth();
  if (locale === 'en') {
    if (sameMonth) {
      return `${format(from, 'MM/dd')} — ${format(to, 'MM/dd/yyyy')}`;
    }
    return `${format(from, 'MM/dd/yyyy')} — ${format(to, 'MM/dd/yyyy')}`;
  }
  if (sameMonth) {
    return `${format(from, 'dd')} — ${format(to, 'dd.MM.yyyy')}`;
  }
  return `${format(from, 'dd.MM.yyyy')} — ${format(to, 'dd.MM.yyyy')}`;
};

export const DateRangePicker = ({
  from,
  to,
  onChange,
  max,
  'aria-label': ariaLabel,
  className,
  disabled,
}: DateRangePickerProps) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(0, 2);
  const locale: CalendarDateLocale =
    lang === 'ru' || lang === 'en' ? lang : 'uz';

  const effectiveMax = max ?? tashkentTodayCalendarDate();
  const maxDate = parseCalendarDate(effectiveMax);
  const committedFrom = from ? parseCalendarDate(from) : undefined;
  const committedTo = to ? parseCalendarDate(to) : undefined;
  const hasCommitted = Boolean(committedFrom && committedTo);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  // Fresh selection: first click sets anchor only; second click commits.
  // react-day-picker range mode often emits {from,to}=same day on the first
  // click — we must not treat that as a completed range.
  const [anchor, setAnchor] = useState<Date | undefined>();
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setMonths(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Drop incomplete draft when the popover closes without a full range.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDraft(undefined);
      setAnchor(undefined);
    }
  };

  const selected: DateRange | undefined = draft
    ? draft
    : hasCommitted
      ? { from: committedFrom, to: committedTo }
      : undefined;

  const label =
    committedFrom && committedTo
      ? formatRangeLabel(committedFrom, committedTo, locale)
      : t('daterange.placeholder');

  const commit = (nextFrom: Date, nextTo: Date) => {
    let a = startOfLocalDay(nextFrom);
    let b = startOfLocalDay(nextTo);
    a = clampToMax(a, maxDate);
    b = clampToMax(b, maxDate);
    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    onChange(formatCalendarDate(a), formatCalendarDate(b));
    setDraft(undefined);
    setAnchor(undefined);
    setOpen(false);
  };

  const handleSelect = (_range: DateRange | undefined, triggerDate: Date) => {
    const day = startOfLocalDay(triggerDate);
    if (maxDate && day > maxDate) return;

    // Always a fresh from → to pick (every open/select cycle). First click
    // sets start only; second click commits the inclusive range.
    if (!anchor) {
      setAnchor(day);
      setDraft({ from: day, to: undefined });
      return;
    }

    commit(anchor, day);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(undefined, undefined);
    setDraft(undefined);
    setAnchor(undefined);
  };

  const disabledDays = maxDate ? [{ after: maxDate }] : [];

  return (
    <div
      className={cn('relative inline-flex items-center', className)}
      data-testid="date-range-picker"
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            // Empty: static name. Committed: visible range text is the accessible name.
            aria-label={
              hasCommitted ? undefined : (ariaLabel ?? t('daterange.open'))
            }
            className={cn(
              'inline-flex h-9 min-w-[11rem] items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm',
              'hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              hasCommitted ? 'pr-8 text-foreground' : 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={months}
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={
              committedFrom ??
              parseCalendarDate(tashkentTodayCalendarDate()) ??
              maxDate
            }
            disabled={disabledDays}
            autoFocus
            labels={{
              labelPrevious: () => t('datepicker.previous_month'),
              labelNext: () => t('datepicker.next_month'),
            }}
          />
        </PopoverContent>
      </Popover>
      {hasCommitted && !disabled ? (
        <button
          type="button"
          aria-label={t('daterange.clear')}
          onClick={handleClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
};

export default DateRangePicker;
