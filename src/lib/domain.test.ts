import { describe, expect, it } from 'vitest';
import { isRootDomain, rootDomainAppUrl } from '@/lib/domain';

describe('isRootDomain', () => {
  it('is true for the bare production apex', () => {
    expect(isRootDomain('automaktab.uz')).toBe(true);
  });

  it('is false for local dev, the app subdomain, and Vercel previews', () => {
    expect(isRootDomain('localhost')).toBe(false);
    expect(isRootDomain('127.0.0.1')).toBe(false);
    expect(isRootDomain('app.automaktab.uz')).toBe(false);
    expect(
      isRootDomain('autodrive-frontend-git-feat-x-arxsolution.vercel.app'),
    ).toBe(false);
  });
});

describe('rootDomainAppUrl', () => {
  it('builds a full https URL on the app subdomain', () => {
    expect(rootDomainAppUrl('/dashboard')).toBe(
      'https://app.automaktab.uz/dashboard',
    );
    expect(rootDomainAppUrl('/students/42')).toBe(
      'https://app.automaktab.uz/students/42',
    );
  });
});
