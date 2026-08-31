import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('umami analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete (window as unknown as Record<string, unknown>).umami;
    document.head
      .querySelectorAll('script[data-website-id]')
      .forEach((script) => script.remove());
  });

  it('flushes an event queued before the analytics script loads', async () => {
    vi.stubEnv('VITE_UMAMI_SRC', 'https://cloud.umami.is/script.js');
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'website-id');
    const { initUmami, track } = await import('@/lib/umami');
    const umamiTrack = vi.fn();

    track('demo_enter', { locale: 'uz' });
    initUmami();

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[data-website-id="website-id"]',
    );
    expect(script).toBeTruthy();

    window.umami = { track: umamiTrack };
    script?.dispatchEvent(new Event('load'));

    expect(umamiTrack).toHaveBeenCalledOnce();
    expect(umamiTrack).toHaveBeenCalledWith('demo_enter', { locale: 'uz' });
  });

  it('tracks immediately when umami is available', async () => {
    const { track } = await import('@/lib/umami');
    const umamiTrack = vi.fn();
    window.umami = { track: umamiTrack };

    track('student_create');

    expect(umamiTrack).toHaveBeenCalledWith('student_create', undefined);
  });
});
