import { format, isValid, parse } from 'date-fns';

// autodrive-qsgc.3: calendar dates (no time-of-day) are plain YYYY-MM-DD
// strings at every boundary — form, wire, API. Date objects exist ONLY as
// local-midnight constructions inside the picker; new Date('YYYY-MM-DD')
// (implicit UTC parse, which shifts the day under positive offsets like
// Asia/Tashkent) is forbidden anywhere in the date path.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// With a full y/M/d pattern date-fns never reads the reference date, so the
// parse is deterministic — a fixed reference keeps render-path calls pure
// (react-hooks compiler: no impure new Date() in render).
const PARSE_REFERENCE = new Date(2000, 0, 1);

// 'YYYY-MM-DD' -> local-midnight Date, undefined for anything else
// (impossible dates like 2026-02-30 included — date-fns rejects them).
export const parseCalendarDate = (value: string): Date | undefined => {
  if (!ISO_DATE_RE.test(value)) return undefined;
  const date = parse(value, 'yyyy-MM-dd', PARSE_REFERENCE);
  return isValid(date) ? date : undefined;
};

// Local-midnight Date -> 'YYYY-MM-DD' via LOCAL components (toISOString
// would convert to UTC first and shift the day under UTC+N timezones).
export const formatCalendarDate = (date: Date): string =>
  format(date, 'yyyy-MM-dd');

// Today as 'YYYY-MM-DD' in the local timezone — replaces the
// new Date().toISOString().split('T')[0] pattern, which returns the UTC day
// (yesterday for Asia/Tashkent between 00:00 and 05:00 local).
export const todayCalendarDate = (): string => formatCalendarDate(new Date());

export type CalendarDateLocale = 'uz' | 'ru' | 'en';

const DOTTED_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const SLASHED_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const makeLocalDate = (
  year: number,
  month: number,
  day: number,
): Date | undefined => {
  const date = new Date(year, month - 1, day);
  // Component check rejects impossible dates (Feb 30 rolls into March).
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
};

// Typed keyboard entry: ISO yyyy-mm-dd always, plus the locale's display
// pattern (dd.mm.yyyy for uz/ru, MM/dd/yyyy for en).
export const parseTypedCalendarDate = (
  text: string,
  locale: CalendarDateLocale,
): Date | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const iso = parseCalendarDate(trimmed);
  if (iso) return iso;
  if (locale === 'en') {
    const slashed = SLASHED_RE.exec(trimmed);
    if (slashed)
      return makeLocalDate(
        Number(slashed[3]),
        Number(slashed[1]),
        Number(slashed[2]),
      );
    return undefined;
  }
  const dotted = DOTTED_RE.exec(trimmed);
  if (dotted)
    return makeLocalDate(
      Number(dotted[3]),
      Number(dotted[2]),
      Number(dotted[1]),
    );
  return undefined;
};
