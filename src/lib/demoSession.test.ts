import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isDemoCompanyUser, isOneClickDemoLoginEnabled } from './demoSession';

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_DEMO_LOGIN', 'false');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('one-click demo login gate', () => {
  it('is controlled only by the production flag', () => {
    expect(isOneClickDemoLoginEnabled()).toBe(false);

    vi.stubEnv('VITE_ENABLE_DEMO_LOGIN', 'true');
    expect(isOneClickDemoLoginEnabled()).toBe(true);
  });
});

describe('demo company session', () => {
  it('matches the demo company slug or the demo login email', () => {
    expect(isDemoCompanyUser(null)).toBe(false);
    expect(
      isDemoCompanyUser({
        email: 'owner@school.uz',
        company_slug: 'another-school',
      }),
    ).toBe(false);
    expect(
      isDemoCompanyUser({
        email: 'manager@example.com',
        company_slug: 'automaktab-demo-2026',
      }),
    ).toBe(true);
    expect(
      isDemoCompanyUser({
        email: 'Demo@AutoMaktab.uz',
        company_slug: null,
      }),
    ).toBe(true);
  });
});
