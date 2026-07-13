import { describe, it, expect } from 'vitest';
import { isValidPhone, isValidName } from './validation';

describe('isValidPhone', () => {
  it('rejects a phone with too few digits', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('accepts a valid phone number', () => {
    expect(isValidPhone('+998901234567')).toBe(true);
  });
});

describe('isValidName', () => {
  it('rejects a name that is only symbols', () => {
    expect(isValidName('.')).toBe(false);
  });

  it('accepts a name containing letters', () => {
    expect(isValidName('Aziz')).toBe(true);
  });
});
