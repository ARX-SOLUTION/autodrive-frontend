import { describe, expect, it } from 'vitest';
import {
  fuelLineSchema,
  fiscalQr,
  canReviewFuel,
  classifyFuelLine,
  detectFundingSource,
} from './policy';
describe('fuel evidence and amount boundaries', () => {
  it('only selects fiscal Soliq URLs from multiple QR values', () => {
    expect(
      fiscalQr([
        'https://safia.uz/loyalty',
        'https://ofd.soliq.uz/check?t=A&r=1&c=20260927172124&s=123456789012',
      ]),
    ).toContain('ofd.soliq.uz');
    expect(fiscalQr(['https://ofd.soliq.uz.evil.test/check?t=A'])).toBeNull();
  });
  it('rejects fiscal QR hosts that the lookup API does not accept', () => {
    expect(
      fiscalQr([
        'https://new-ofd.soliq.uz/check?t=A&r=1&c=20260927172124&s=123456789012',
      ]),
    ).toBeNull();
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
  it('correctly classifies real receipt fuel lines', () => {
    // Receipt 1: Benzin marki AI-95 RUS
    const r1 = classifyFuelLine(
      'Бензин марки АИ-95 RUS, литр',
      '02710001007000000',
    );
    expect(r1.fuel_type).toBe('petrol');
    expect(r1.unit).toBe('litre');
    expect(r1.is_fuel).toBe(true);

    // Receipt 2: TPK-4 AI-95-K5 TAHEKO
    const r2 = classifyFuelLine(
      'TPK-4 AI-95-K5 TAHEKO 56.42 x 19500.00, litr',
      '02710001007000000',
    );
    expect(r2.fuel_type).toBe('petrol');
    expect(r2.unit).toBe('litre');
    expect(r2.is_fuel).toBe(true);

    // Receipt 3: Benzin marki AI 92uzb
    const r3 = classifyFuelLine(
      'Бензин марки АИ 92uzb, литр',
      '02710001005000000',
    );
    expect(r3.fuel_type).toBe('petrol');
    expect(r3.unit).toBe('litre');
    expect(r3.is_fuel).toBe(true);

    // Receipt 4: TRK 3: AI-95 EVRO
    const r4 = classifyFuelLine('TRK 3: АИ-95 ЕВРО', '02710001007000000');
    expect(r4.fuel_type).toBe('petrol');
    expect(r4.unit).toBe('litre');
    expect(r4.is_fuel).toBe(true);

    // Methane and propane tests
    const methane = classifyFuelLine('CNG Gaz Metan avto', '02711002001000000');
    expect(methane.fuel_type).toBe('methane');
    expect(methane.unit).toBe('m3');
    expect(methane.is_fuel).toBe(true);

    const propane = classifyFuelLine(
      'LPG Gaz Propan avto',
      '02711001001000000',
    );
    expect(propane.fuel_type).toBe('propane');
    expect(propane.unit).toBe('litre');
    expect(propane.is_fuel).toBe(true);

    // Non-fuel test (e.g. coffee)
    const coffee = classifyFuelLine('Americano Kofe 250ml');
    expect(coffee.is_fuel).toBe(false);
  });
  it('correctly detects funding source from payment lines', () => {
    expect(detectFundingSource('BANK KARTASI: 1 872 000 KORPORATIV')).toBe(
      'school_card',
    );
    expect(detectFundingSource('Korporativ turi RRN: 031684154832')).toBe(
      'school_card',
    );
    expect(detectFundingSource('UZCARD AAB PL.KARTA')).toBe('school_card');
    expect(detectFundingSource('Nasiya shartnomasi')).toBe('partner_credit');
    expect(detectFundingSource('Avans hisobidan')).toBe('advance');
    expect(detectFundingSource('Naqd pul')).toBe('personal');
  });
});
