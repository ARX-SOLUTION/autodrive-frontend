import { describe, expect, it } from 'vitest';
import { formatMoney, groupDigits } from './money';
import {
  formatUzPhoneInput,
  isValidUzPhone,
  uzLocalDigits,
  uzPhoneE164,
} from './phoneFormater';

describe('formatMoney', () => {
  it('groups thousands with spaces and appends soʻm', () => {
    expect(formatMoney(1234567)).toBe("1 234 567 so'm");
  });
  it('handles a numeric string', () => {
    expect(formatMoney('5000000')).toBe("5 000 000 so'm");
  });
  it('renders 0 soʻm for nullish / non-finite input', () => {
    expect(formatMoney(null)).toBe("0 so'm");
    expect(formatMoney(undefined)).toBe("0 so'm");
    expect(formatMoney(NaN)).toBe("0 so'm");
  });
});

describe('groupDigits', () => {
  it('groups a raw digit string, no suffix', () => {
    expect(groupDigits('5000000')).toBe('5 000 000');
  });
  it('strips non-digits and returns empty for none', () => {
    expect(groupDigits('abc')).toBe('');
    expect(groupDigits('12ab34')).toBe('1 234');
  });
});

describe('uz phone helpers', () => {
  it('extracts 9 local digits regardless of +998 / spaces', () => {
    expect(uzLocalDigits('+998 90 123 45 67')).toBe('901234567');
    expect(uzLocalDigits('998901234567')).toBe('901234567');
    expect(uzLocalDigits('901234567')).toBe('901234567');
  });
  it('validates exactly 9 local digits', () => {
    expect(isValidUzPhone('+998901234567')).toBe(true);
    expect(isValidUzPhone('+99890123456')).toBe(false); // 8 digits
    expect(isValidUzPhone('')).toBe(false);
  });
  it('produces E.164 for storage', () => {
    expect(uzPhoneE164('90 123 45 67')).toBe('+998901234567');
    expect(uzPhoneE164('123')).toBe('');
  });
  it('masks progressively while typing', () => {
    expect(formatUzPhoneInput('90')).toBe('+998 90');
    expect(formatUzPhoneInput('901234567')).toBe('+998 90 123 45 67');
    expect(formatUzPhoneInput('')).toBe('+998');
  });
});
