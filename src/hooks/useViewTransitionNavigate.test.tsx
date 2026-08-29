import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { createRouterTestWrapper } from '@/test/utils/renderWithRouter';
import { useViewTransitionNavigate } from './useViewTransitionNavigate';

// CRM navigation is deliberately plain: callers keep the old three-argument
// API, but no browser snapshot or element style mutation should run.

const renderNavigateHook = async () => {
  const { router, wrapper } = await createRouterTestWrapper({
    initialEntry: '/source',
    routePattern: '/$',
  });
  const hook = renderHook(() => useViewTransitionNavigate(), { wrapper });
  const navigateSpy = vi.spyOn(router, 'navigate');

  return { ...hook, navigateSpy };
};

describe('useViewTransitionNavigate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - jsdom doesn't define this; tests add/remove it
    delete document.startViewTransition;
  });

  it('navigates directly without mutating the source element', async () => {
    const { result, navigateSpy } = await renderNavigateHook();
    const el = document.createElement('div');

    await act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/students/1' }),
    );
    expect(el.style.viewTransitionName).toBe('');
  });

  it('does not start a browser view transition when the API exists', async () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;

    const { result, navigateSpy } = await renderNavigateHook();
    const el = document.createElement('div');

    await act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/students/1' }),
    );
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it('accepts navigation without a named source element', async () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;

    const { result, navigateSpy } = await renderNavigateHook();

    await act(() => result.current('/dashboard', null, ''));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard' }),
    );
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it('ignores a requested transition name and still navigates once', async () => {
    document.startViewTransition =
      vi.fn() as typeof document.startViewTransition;

    const { result, navigateSpy } = await renderNavigateHook();
    const el = document.createElement('div');

    await act(() => result.current('/students/1', el, 'student-1'));

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/students/1' }),
    );
    expect(el.style.viewTransitionName).toBe('');
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });
});
