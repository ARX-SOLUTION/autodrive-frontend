import { useNavigate, type NavigateOptions } from '@tanstack/react-router';

/**
 * Keeps one navigation API for existing row/card callers. CRM navigation is
 * intentionally immediate: no document snapshot, flushSync, or morph work.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return (
    options: NavigateOptions,
    _el: HTMLElement | null,
    _transitionName: string,
  ) => navigate(options);
}
