import { formatCalendarDate } from '@/lib/calendarDate';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const tashkentToday = (): Date => {
  const tashkentNow = new Date(Date.now() + TASHKENT_OFFSET_MS);
  return new Date(
    tashkentNow.getUTCFullYear(),
    tashkentNow.getUTCMonth(),
    tashkentNow.getUTCDate(),
  );
};

// Today as 'YYYY-MM-DD' in the Tashkent (UTC+5) business day, not the device
// OS day — matches the backend's UZ+5 day-bucket math so a client in another
// timezone can't be capped a day behind around UZ midnight.
export const tashkentTodayCalendarDate = (): string =>
  formatCalendarDate(tashkentToday());
