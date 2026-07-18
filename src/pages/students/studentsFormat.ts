import { format } from 'date-fns';
import type { ResultStatus } from '@/types/student';

export const capitalize = (str?: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

export const formatDate = (d?: string) => {
  try {
    if (!d) return '—';
    const date = new Date(d);
    return format(date, 'dd.MM.yyyy');
  } catch {
    return d;
  }
};

export const formatDateTime = (d: string) => {
  try {
    if (!d) return '—';
    return format(new Date(d), 'dd.MM.yyyy HH:mm');
  } catch {
    return d;
  }
};

// Same labels StudentModal shows in its result <Select> (autodrive-6cq.11.4)
// — built from the caller's `t` rather than exported as a constant so tests
// that mock '@/components/ui/StudentModal' don't need to also stub this map.
export const resultLabels = (
  t: (key: string) => string,
): Record<ResultStatus, string> => ({
  oqimoqda: t('students.status_studying'),
  topshirdi: t('students.status_passed'),
  yiqildi: t('students.status_failed'),
});
