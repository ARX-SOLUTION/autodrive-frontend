import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsMobile } from './use-mobile';

// react-hooks/set-state-in-effect fix: matchMedia mirror moved from a
// useState+useEffect pair to useSyncExternalStore. Locks down that it still
// (a) reflects the real viewport width and (b) updates when the media query
// crosses the breakpoint -- the exact behavior the old effect+listener gave.

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

const listeners = new Set<() => void>();
const fireChange = () => listeners.forEach((l) => l());

afterEach(() => {
  listeners.clear();
});

const stubMatchMedia = () => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  })) as unknown as typeof window.matchMedia;
};

describe('useIsMobile', () => {
  it('reflects the current viewport width on mount', () => {
    stubMatchMedia();
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('is false above the breakpoint', () => {
    stubMatchMedia();
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when the media query change event fires', () => {
    stubMatchMedia();
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setWidth(400);
    act(() => fireChange());

    expect(result.current).toBe(true);
  });
});
