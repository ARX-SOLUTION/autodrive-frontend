// Single source of truth for Uzbek soʻm formatting. Every place that shows a
// money amount should use this instead of a local `money()` helper, so the
// grouping and suffix stay identical across the whole app.
//
// "1234567" -> "1 234 567 soʻm" (space-grouped, ru-RU locale, apostrophe soʻm).

const groupSep = (n: number): string =>
  // ru-RU groups with a non-breaking space; normalise both nbsp and any comma
  // to a plain space so the output is consistent regardless of the JS runtime.
  n
    .toLocaleString('ru-RU')
    .replace(/\u00A0/g, ' ')
    .replace(/,/g, ' ');

/** "1 234 567 soʻm". Nullish / non-finite input renders as "0 soʻm". */
export const formatMoney = (value?: number | string | null): string => {
  const n = Number(value ?? 0);
  return `${Number.isFinite(n) ? groupSep(n) : 0} so'm`;
};

/** Space-grouped digits WITHOUT the soʻm suffix — for amount input fields that
 *  show a running, readable total while the user types. Strips non-digits. */
export const groupDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits ? groupSep(Number(digits)) : '';
};
