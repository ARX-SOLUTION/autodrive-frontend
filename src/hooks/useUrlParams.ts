import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List-page filter/sort/page state that lives in the URL, so reload, back
 * navigation, and shared links all restore it (autodrive-6cq.5.8). Extracted
 * from StudentsPage's original inline setParam/setSearchParams pattern —
 * reuse this instead of re-inlining it per page.
 */
export function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Memoized (setSearchParams is stable) so consumers can safely put these — or
  // wrappers built on them — in effect deps without re-running every render.
  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Multiple keys must land in the same setSearchParams call — two
  // sequential setParam calls each snapshot `prev` independently and the
  // second overwrites the first's write (autodrive-6cq.5.70).
  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (!value) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { searchParams, setParam, setParams };
}
