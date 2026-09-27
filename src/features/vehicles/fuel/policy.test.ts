import { describe, expect, it } from 'vitest';
import { fuelLineSchema, fiscalQr, canReviewFuel } from './policy';
describe('fuel evidence and amount boundaries', () => {
  it('only selects fiscal Soliq URLs from multiple QR values', () => {
    expect(
      fiscalQr([
        'https://safia.uz/loyalty',
        'https://ofd.soliq.uz/check?t=A&r=1&c=20260927172124&s=12',
      ]),
    ).toContain('ofd.soliq.uz');
    expect(fiscalQr(['https://ofd.soliq.uz.evil.test/check?t=A'])).toBeNull();
  });
  it('requires an explicit fuel type and preserves row total separately', () => {
    const line = {
      fuel_type: 'petrol',
      unit: 'litre',
      quantity: '2',
      unit_price: '13000',
      line_total: '26000',
      name: 'Fuel',
      mxik: '',
    };
    expect(fuelLineSchema.parse(line).line_total).toBe('26000');
    expect(fuelLineSchema.safeParse({ ...line, fuel_type: '' }).success).toBe(
      false,
    );
    expect(fuelLineSchema.safeParse({ ...line, quantity: '-2' }).success).toBe(
      false,
    );
  });
  it('keeps teacher review out of finance approval', () => {
    expect(canReviewFuel('teacher')).toBe(false);
    expect(canReviewFuel('accountant')).toBe(true);
  });
});
