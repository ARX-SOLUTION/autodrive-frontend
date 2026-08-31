import { describe, expect, it } from 'vitest';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';

describe('getDefaultAuthenticatedRoute', () => {
  it('sends an accountant to the T2 finance landing', () => {
    expect(getDefaultAuthenticatedRoute('accountant')).toBe('/expenses');
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
