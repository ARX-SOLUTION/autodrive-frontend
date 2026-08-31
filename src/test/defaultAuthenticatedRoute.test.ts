import { describe, expect, it } from 'vitest';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';

describe('getDefaultAuthenticatedRoute', () => {
  it('keeps an accountant on the finance-safe profile landing in T1', () => {
    expect(getDefaultAuthenticatedRoute('accountant')).toBe('/profile');
  });

  it('keeps operational roles on the dashboard', () => {
    expect(getDefaultAuthenticatedRoute('owner')).toBe('/dashboard');
    expect(getDefaultAuthenticatedRoute('teacher')).toBe('/dashboard');
  });

  it('keeps a missing role on the safe profile landing', () => {
    expect(getDefaultAuthenticatedRoute(null)).toBe('/profile');
    expect(getDefaultAuthenticatedRoute(undefined)).toBe('/profile');
  });
});
