import { tashkentToday } from '@/lib/tashkentDate';

// Date preset helpers
// ponytail (L2): "today" means Tashkent's calendar day, not the device
// OS's — matches the backend's hardcoded UZ+5 day-bucket math (uzDayStart/
// uzDayEnd) so a device in another timezone can't pick a day that's off by
// one right around midnight UZ time. Returns a local-midnight Date for that
// Tashkent day, so downstream setDate()/toLocalDateStr() keep working as-is.
const weekAgo = () => {
  const d = tashkentToday();
  d.setDate(d.getDate() - 6);
  return d;
};
const monthStart = () => {
  const d = tashkentToday();
  d.setDate(1);
  return d;
};
const lastMonthStart = () => {
  const d = tashkentToday();
  d.setMonth(d.getMonth() - 1, 1);
  return d;
};
const lastMonthEnd = () => {
  const d = tashkentToday();
  d.setDate(0);
  return d;
};

export type DatePreset = 'today' | 'week' | 'month' | 'lastMonth' | 'all';

export const presetRange = (
  preset: DatePreset,
): { from: Date | undefined; to: Date | undefined } => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  switch (preset) {
    case 'today':
      return { from: tashkentToday(), to: now };
    case 'week':
      return { from: weekAgo(), to: now };
    case 'month':
      return { from: monthStart(), to: now };
    case 'lastMonth':
      return { from: lastMonthStart(), to: lastMonthEnd() };
    case 'all':
      return { from: undefined, to: undefined };
  }
};
