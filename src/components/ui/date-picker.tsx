import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from '@phosphor-icons/react';

import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  formatCalendarDate,
  parseCalendarDate,
  parseTypedCalendarDate,
  type CalendarDateLocale,
} from '@/lib/calendarDate';

export interface DatePickerProps {
  // The boundary value is ALWAYS a calendar-date string 'YYYY-MM-DD' (or
  // undefined when empty) — never a Date, never an ISO datetime.
  value?: string;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
  disabled?: boolean;
  // Inclusive range bounds, 'YYYY-MM-DD'.
  min?: string;
  max?: string;
  // Shows a clear button when a value is present (emits undefined).
  clearable?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
}

const DISPLAY_PATTERNS: Record<CalendarDateLocale, string> = {
  uz: 'dd.MM.yyyy',
  ru: 'dd.MM.yyyy',
  en: 'MM/dd/yyyy',
};

// Shared calendar-date picker (autodrive-qsgc.3): the ONE date input for
// date-only fields. Built from the existing Calendar + Popover primitives —
// no new dependency. Keyboard entry parses the locale's display pattern plus
// ISO; the calendar is keyboard-navigable (react-day-picker) and both the
// input and the trigger button keep visible focus rings.
export const DatePicker = ({
  value,
  onChange,
  onBlur,
  disabled,
  min,
  max,
  clearable,
  placeholder,
  id,
  name,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
}: DatePickerProps) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(0, 2);
  const locale: CalendarDateLocale =
    lang === 'ru' || lang === 'en' ? lang : 'uz';
  const displayPattern = DISPLAY_PATTERNS[locale];

  const [open, setOpen] = useState(false);

  const selected = value ? parseCalendarDate(value) : undefined;
  const toDisplay = (date: Date) => format(date, displayPattern);

  const [text, setText] = useState(() => (selected ? toDisplay(selected) : ''));
  // react-hooks/set-state-in-effect: sanctioned render-phase reset (same
  // pattern as StudentModal's dupQueryForDismissal) — re-sync the typed text
  // when the value changes from outside (form reset, prefill, calendar
  // select, clear).
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(selected ? toDisplay(selected) : '');
  }

  const minDate = min ? parseCalendarDate(min) : undefined;
  const maxDate = max ? parseCalendarDate(max) : undefined;
  const inRange = (date: Date) =>
    (!minDate || date >= minDate) && (!maxDate || date <= maxDate);

  const commitText = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    const parsed = parseTypedCalendarDate(trimmed, locale);
    if (parsed && inRange(parsed)) {
      onChange(formatCalendarDate(parsed));
      setText(toDisplay(parsed));
    } else {
      // Revert to the last valid value rather than emitting garbage.
      setText(selected ? toDisplay(selected) : '');
    }
  };

  const handleSelect = (day: Date | undefined) => {
    setOpen(false);
    onChange(day ? formatCalendarDate(day) : undefined);
  };

  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitText();
          }
        }}
        onBlur={() => {
          commitText();
          onBlur?.();
        }}
        placeholder={placeholder ?? t('datepicker.placeholder')}
        disabled={disabled}
        autoComplete="off"
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        aria-invalid={ariaInvalid}
        className={cn(
          'aria-invalid:border-destructive',
          clearable && value && !disabled ? 'pr-16' : 'pr-10',
        )}
      />
      {clearable && value && !disabled && (
        <button
          type="button"
          aria-label={t('datepicker.clear')}
          onClick={() => onChange(undefined)}
          className="absolute right-9 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={t('datepicker.open_calendar')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? minDate}
            disabled={disabledDays}
            autoFocus
            labels={{
              labelPrevious: () => t('datepicker.previous_month'),
              labelNext: () => t('datepicker.next_month'),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePicker;
