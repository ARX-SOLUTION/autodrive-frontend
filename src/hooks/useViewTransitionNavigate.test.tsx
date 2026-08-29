import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { useViewTransitionNavigate } from './useViewTransitionNavigate';

// CRM navigation is deliberately plain: callers keep the old three-argument
// API, but no browser snapshot or element style mutation should run.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useViewTransitionNavigate', () => {
  afterEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - jsdom doesn't define this; tests add/remove it
    delete document.startViewTransition;
  });

  it('navigates directly without mutating the source element', () => {
    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });
    const el = document.createElement('div');

    act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateMock).toHaveBeenCalledWith('/students/1');
    expect(el.style.viewTransitionName).toBe('');
  });

  it('does not start a browser view transition when the API exists', () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });
    const el = document.createElement('div');

    act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateMock).toHaveBeenCalledWith('/students/1');
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it('accepts navigation without a named source element', () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });

    act(() => result.current('/dashboard', null, ''));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it('ignores a requested transition name and still navigates once', () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });
    const el = document.createElement('div');

    act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateMock).toHaveBeenCalledWith('/students/1');
    expect(el.style.viewTransitionName).toBe('');
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });
});
