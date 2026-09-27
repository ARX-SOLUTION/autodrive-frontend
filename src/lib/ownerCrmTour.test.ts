import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import uz from '@/i18n/locales/uz.json';
import { shouldStartTour, type TourStartInput } from './ownerCrmTour';

const ownerReady = (): TourStartInput => ({
  role: 'owner',
  email: 'owner@school.uz',
  companySlug: 'maktab-1',
  crmTourCompletedAt: null,
  blockingModal: false,
});

describe('shouldStartTour', () => {
  it('starts for an owner who has not finished and is not blocked', () => {
    expect(shouldStartTour(ownerReady())).toBe(true);
    expect(
      shouldStartTour({ ...ownerReady(), crmTourCompletedAt: undefined }),
    ).toBe(true);
    expect(
      shouldStartTour({ ...ownerReady(), crmTourCompletedAt: '   ' }),
    ).toBe(true);
  });

  it('stays off when the server already stored a completion time', () => {
    expect(
      shouldStartTour({
        ...ownerReady(),
        crmTourCompletedAt: '2026-09-26T06:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('stays off for the demo company email or slug', () => {
    expect(
      shouldStartTour({ ...ownerReady(), email: 'demo@automaktab.uz' }),
    ).toBe(false);
    expect(
      shouldStartTour({
        ...ownerReady(),
        email: 'Demo@AutoMaktab.uz',
        companySlug: null,
      }),
    ).toBe(false);
    expect(
      shouldStartTour({
        ...ownerReady(),
        companySlug: 'automaktab-demo-2026',
      }),
    ).toBe(false);
  });

  it('stays off for every non-owner role', () => {
    for (const role of [
      'dev',
      'manager',
      'accountant',
      'operator',
      'teacher',
    ]) {
      expect(shouldStartTour({ ...ownerReady(), role })).toBe(false);
    }
  });

  it('stays off while a forced modal is still up', () => {
    expect(shouldStartTour({ ...ownerReady(), blockingModal: true })).toBe(
      false,
    );
  });
});

describe('crm tour copy', () => {
  it('uses the same keys in uz, ru, and en, without an em dash', () => {
    const keys = (tour: Record<string, string>) => Object.keys(tour).sort();
    expect(keys(ru.crm_tour)).toEqual(keys(uz.crm_tour));
    expect(keys(en.crm_tour)).toEqual(keys(uz.crm_tour));
    for (const tour of [uz.crm_tour, ru.crm_tour, en.crm_tour]) {
      expect(JSON.stringify(tour)).not.toContain('—');
      expect(JSON.stringify(tour)).not.toContain('–');
    }
  });
});
