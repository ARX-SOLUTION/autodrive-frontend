import { describe, it, expect, beforeEach } from 'vitest';
import { track } from '@/lib/umami';

describe('track()', () => {
  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).umami;
  });

  it('no-ops without window.umami', () => {
    expect(() => track('test_event', { foo: 1 })).not.toThrow();
  });

  it('calls window.umami.track when available', () => {
    const spy = { called: false, event: '', data: {} as unknown };
    (window as unknown as Record<string, unknown>).umami = {
      track: (e: string, d: unknown) => { spy.called = true; spy.event = e; spy.data = d; },
    };
    track('student_create', { role: 'operator' });
    expect(spy.called).toBe(true);
    expect(spy.event).toBe('student_create');
  });
});
