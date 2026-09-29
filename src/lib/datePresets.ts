import { tashkentToday } from '@/lib/tashkentDate';
import { formatCalendarDate } from '@/lib/calendarDate';

export type DatePresetKey =
  'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'allTime';

export interface DateRangeStrings {
  from?: string;
  to?: string;
}

export interface DatePresetItem {
  key: DatePresetKey;
  labelKey: string;
  getRange: () => DateRangeStrings;
}

/**
 * Calculates date range strings for predefined date presets.
 * All computations are anchored to Tashkent (UTC+5) calendar day.
 */
export const getDatePresetRange = (key: DatePresetKey): DateRangeStrings => {
  const today = tashkentToday();

  switch (key) {
    case 'today': {
      const todayStr = formatCalendarDate(today);
      return { from: todayStr, to: todayStr };
    }
    case 'thisWeek': {
      // Uzbekistan business week starts on Monday
      const day = today.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + diffToMonday,
      );
      return {
        from: formatCalendarDate(monday),
        to: formatCalendarDate(today),
      };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: formatCalendarDate(startOfMonth),
        to: formatCalendarDate(today),
      };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        from: formatCalendarDate(startOfLastMonth),
        to: formatCalendarDate(endOfLastMonth),
      };
    }
    case 'allTime':
    default:
      return { from: undefined, to: undefined };
  }
};

export const DATE_PRESETS: DatePresetItem[] = [
  {
    key: 'today',
    labelKey: 'date_presets.today',
    getRange: () => getDatePresetRange('today'),
  },
  {
    key: 'thisWeek',
    labelKey: 'date_presets.this_week',
    getRange: () => getDatePresetRange('thisWeek'),
  },
  {
    key: 'thisMonth',
    labelKey: 'date_presets.this_month',
    getRange: () => getDatePresetRange('thisMonth'),
  },
  {
    key: 'lastMonth',
    labelKey: 'date_presets.last_month',
    getRange: () => getDatePresetRange('lastMonth'),
  },
  {
    key: 'allTime',
    labelKey: 'date_presets.all_time',
    getRange: () => getDatePresetRange('allTime'),
  },
];

/**
 * Checks whether given (from, to) strings match a specific preset.
 */
export const isMatchingPreset = (
  from: string | undefined,
  to: string | undefined,
  presetKey: DatePresetKey,
): boolean => {
  const range = getDatePresetRange(presetKey);
  return (range.from ?? '') === (from ?? '') && (range.to ?? '') === (to ?? '');
};

/**
 * Returns the matching preset key if the current (from, to) matches one,
 * or null if it's a custom range.
 */
export const getActiveDatePreset = (
  from?: string,
  to?: string,
): DatePresetKey | null => {
  if (!from && !to) {
    return 'allTime';
  }
  for (const preset of DATE_PRESETS) {
    if (preset.key === 'allTime') continue;
    if (isMatchingPreset(from, to, preset.key)) {
      return preset.key;
    }
  }
  return null;
};
