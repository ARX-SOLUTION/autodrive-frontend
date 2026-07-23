import { describe, it, expect, vi } from 'vitest';
import { prefetchRoute } from '@/lib/routePrefetch';

// Perf helper: prefetch a route's lazy chunk on nav hover/focus. Uses distinct
// paths per test since the "already warmed" set is module-global.
describe('prefetchRoute', () => {
  it('warms a known path exactly once', () => {
    const importer = vi.fn(() => Promise.resolve());
    prefetchRoute('/warm-once', { '/warm-once': importer });
    prefetchRoute('/warm-once', { '/warm-once': importer });
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an unknown path', () => {
    expect(() => prefetchRoute('/no-such-route', {})).not.toThrow();
  });

  it('re-arms a path whose prefetch rejected so a later hover retries', async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    prefetchRoute('/retry-path', { '/retry-path': importer });
    await Promise.resolve();
    await Promise.resolve();
    prefetchRoute('/retry-path', { '/retry-path': importer });
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
