import type { Metric } from 'web-vitals';

const mocks = vi.hoisted(() => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  track: vi.fn(),
}));

vi.mock('web-vitals', () => ({
  onCLS: mocks.onCLS,
  onINP: mocks.onINP,
  onLCP: mocks.onLCP,
}));

vi.mock('@/lib/umami', () => ({ track: mocks.track }));

import { initWebVitals } from './webVitals';

describe('initWebVitals', () => {
  it('registers core metrics and reports them through Umami', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    initWebVitals();

    expect(mocks.onLCP).toHaveBeenCalledOnce();
    expect(mocks.onINP).toHaveBeenCalledOnce();
    expect(mocks.onCLS).toHaveBeenCalledOnce();

    const report = mocks.onLCP.mock.calls[0]?.[0] as (metric: Metric) => void;
    report({ name: 'LCP', value: 123.6, rating: 'good' } as Metric);

    expect(mocks.track).toHaveBeenCalledWith('web_vitals_lcp', {
      value: 124,
      rating: 'good',
    });

    consoleLog.mockRestore();
  });
});
