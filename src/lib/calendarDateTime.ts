import { parseCalendarDate } from '@/lib/calendarDate';

// Asia/Tashkent is fixed UTC+5 with no DST — explicit offset math keeps
// behavior identical under TZ=UTC and TZ=Asia/Tashkent in tests and CI.
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const ISO_TIME_RE = /^(\d{2}):(\d{2})$/;

export interface DateTimeParts {
  date: string;
  time: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const utcMsFromTashkentWall = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number => Date.UTC(year, month - 1, day, hour - 5, minute);

const tashkentPartsFromUtcMs = (utcMs: number): DateTimeParts => {
  const t = new Date(utcMs + TASHKENT_OFFSET_MS);
  return {
    date: `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`,
    time: `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`,
  };
};

// Wall clock in Asia/Tashkent -> ISO instant (never implicit UTC date parse).
export const partsToIso = ({ date, time }: DateTimeParts): string => {
  const parsed = parseCalendarDate(date);
  if (!parsed) throw new Error(`Invalid calendar date: ${date}`);
  const timeMatch = ISO_TIME_RE.exec(time);
  if (!timeMatch) throw new Error(`Invalid time: ${time}`);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) throw new Error(`Invalid time: ${time}`);
  const utcMs = utcMsFromTashkentWall(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate(),
    hour,
    minute,
  );
  return new Date(utcMs).toISOString();
};

// ISO instant -> { date, time } in Asia/Tashkent for form prefill.
export const isoToParts = (iso: string): DateTimeParts => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()))
    throw new Error(`Invalid ISO datetime: ${iso}`);
  return tashkentPartsFromUtcMs(d.getTime());
};

export const nowTashkentParts = (): DateTimeParts =>
  tashkentPartsFromUtcMs(Date.now());
