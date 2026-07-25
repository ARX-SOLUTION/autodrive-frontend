import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { useViewTransitionNavigate } from './useViewTransitionNavigate';

// autodrive-8i0.5: feature-detection + prefers-reduced-motion fallback, and
// the dynamic-list-item name lifecycle (set on click, cleared once the
// transition finishes) — all testable without a real browser View
// Transitions implementation (jsdom has none).

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

const originalMatchMedia = window.matchMedia;

describe('useViewTransitionNavigate', () => {
  afterEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - jsdom doesn't define this; tests add/remove it
    delete document.startViewTransition;
    window.matchMedia = originalMatchMedia;
  });

  it('falls back to a plain navigate when startViewTransition is unsupported', () => {
    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });
    const el = document.createElement('div');

    act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateMock).toHaveBeenCalledWith('/students/1');
    // fallback path never touches the element's style at all. jsdom's
    // pre-29 CSSOM didn't recognize `viewTransitionName` as a style
    // property at all, so an untouched read fell through to `undefined`;
    // the v29 CSSOM rewrite (Changelog v29.0.0) now recognizes it and
    // reports the spec-correct "" for an unset-but-known property, same
    // as this file's own "cleared" case below (line ~81) and real
    // browsers. Same assertion, different jsdom representation.
    expect(el.style.viewTransitionName).toBe('');
  });

  it('falls back to a plain navigate when prefers-reduced-motion matches', () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });
    const el = document.createElement('div');

    act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateMock).toHaveBeenCalledWith('/students/1');
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it('sets the transition name for the transition, then clears it once finished', async () => {
    let capturedCallback: () => void = () => {};
    document.startViewTransition = vi.fn((cb: () => void) => {
      capturedCallback = cb;
      return { finished: Promise.resolve() };
    }) as unknown as typeof document.startViewTransition;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });
    const el = document.createElement('div');

    act(() => result.current('/students/1', el, 'student-1'));

    expect(el.style.viewTransitionName).toBe('student-1');
    capturedCallback();
    expect(navigateMock).toHaveBeenCalledWith('/students/1');

    await act(async () => {
      await Promise.resolve();
    });
    expect(el.style.viewTransitionName).toBe('');
  });
});
