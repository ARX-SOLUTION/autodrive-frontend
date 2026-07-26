import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isoToParts, partsToIso } from '@/lib/calendarDateTime';

export interface DateTimePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  clearable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
}

const DEFAULT_TIME = '12:00';

const inRange = (iso: string, min?: string, max?: string) => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  if (min && ts < new Date(min).getTime()) return false;
  if (max && ts > new Date(max).getTime()) return false;
  return true;
};

export const DateTimePicker = ({
  value,
  onChange,
  onBlur,
  disabled,
  min,
  max,
  clearable,
  id,
  name,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
}: DateTimePickerProps) => {
  const { t } = useTranslation();
  const parts = value ? isoToParts(value) : undefined;
  const minParts = min ? isoToParts(min) : undefined;
  const maxParts = max ? isoToParts(max) : undefined;

  const [time, setTime] = useState(() => parts?.time ?? '');
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setTime(parts?.time ?? '');
  }

  const emit = (date: string | undefined, nextTime: string) => {
    if (!date) {
      onChange(undefined);
      return;
    }
    const timeValue = nextTime || DEFAULT_TIME;
    try {
      const iso = partsToIso({ date, time: timeValue });
      if (!inRange(iso, min, max)) return;
      onChange(iso);
      setTime(timeValue);
    } catch {
      // Invalid partial input — keep the last valid wire value.
    }
  };

  const handleDateChange = (date: string | undefined) => {
    if (!date) {
      onChange(undefined);
      setTime('');
      return;
    }
    emit(date, time || DEFAULT_TIME);
  };

  const handleTimeChange = (nextTime: string) => {
    setTime(nextTime);
    if (!parts?.date) return;
    emit(parts.date, nextTime);
  };

  const handleTimeBlur = () => {
    if (parts?.date && time) emit(parts.date, time);
    onBlur?.();
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-start',
        className,
      )}
    >
      <DatePicker
        id={id}
        name={name}
        value={parts?.date}
        onChange={handleDateChange}
        disabled={disabled}
        clearable={clearable}
        min={minParts?.date}
        max={maxParts?.date}
        placeholder={t('datetimepicker.placeholder')}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        className="flex-1"
      />
      <Input
        type="time"
        value={time}
        onChange={(e) => handleTimeChange(e.target.value)}
        onBlur={handleTimeBlur}
        disabled={disabled || !parts?.date}
        aria-label={t('datetimepicker.time')}
        className={cn(
          'w-full shrink-0 bg-secondary sm:w-[9.5rem]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      />
    </div>
  );
};

export default DateTimePicker;
