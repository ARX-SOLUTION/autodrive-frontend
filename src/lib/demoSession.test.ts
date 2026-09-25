import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDemoLoginPassword,
  isDemoCompanyUser,
  isOneClickDemoLoginEnabled,
} from './demoSession';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('one-click demo login gate', () => {
  it('stays off unless the production flag and password are both set', () => {
    expect(isOneClickDemoLoginEnabled()).toBe(false);
    expect(getDemoLoginPassword()).toBe('');

    vi.stubEnv('VITE_DEMO_PASSWORD', 'env-demo-secret');
    expect(isOneClickDemoLoginEnabled()).toBe(false);
    expect(getDemoLoginPassword()).toBe('');

    vi.stubEnv('VITE_ENABLE_DEMO_LOGIN', 'true');
    expect(isOneClickDemoLoginEnabled()).toBe(true);
    expect(getDemoLoginPassword()).toBe('env-demo-secret');
  });

  it('treats a blank password as disabled', () => {
    vi.stubEnv('VITE_ENABLE_DEMO_LOGIN', 'true');
    vi.stubEnv('VITE_DEMO_PASSWORD', '   ');
    expect(isOneClickDemoLoginEnabled()).toBe(false);
    expect(getDemoLoginPassword()).toBe('');
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
