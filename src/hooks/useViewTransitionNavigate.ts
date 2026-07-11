import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Wraps react-router `navigate()` in `document.startViewTransition()` so a
 * `view-transition-name` assigned to the clicked row/card morphs into the
 * matching element on the destination page's header — the "dynamic list
 * item" pattern (autodrive-8i0.5). The destination element must carry the
 * same name via `style={{ viewTransitionName: name }}`.
 *
 * Falls back to a plain `navigate()` — no error, no animation — when the
 * API is unsupported or the user prefers reduced motion.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return (path: string, el: HTMLElement | null, transitionName: string) => {
    if (!document.startViewTransition || prefersReducedMotion()) {
      navigate(path);
      return;
    }

    if (el) el.style.viewTransitionName = transitionName;

    // flushSync forces the navigate()-triggered re-render to commit
    // synchronously inside the transition callback — without it React's
    // batching means the browser would snapshot the OLD DOM as the "new"
    // state, and no morph would be visible.
    const transition = document.startViewTransition(() =>
      flushSync(() => navigate(path)),
    );

    // ponytail: clear the transient name once the morph paints, so the next
    // click on a different row can reuse the same name without collision.
    transition.finished.finally(() => {
      if (el) el.style.viewTransitionName = '';
    });
  };
}
