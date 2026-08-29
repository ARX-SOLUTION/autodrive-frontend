import { useNavigate } from 'react-router-dom';

/**
 * Keeps one navigation API for existing row/card callers. CRM navigation is
 * intentionally immediate: no document snapshot, flushSync, or morph work.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return (path: string, _el: HTMLElement | null, _transitionName: string) =>
    navigate(path);
}
