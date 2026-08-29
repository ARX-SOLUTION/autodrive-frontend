import { useCallback, useMemo } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';

type SearchParamsInit =
  | string
  | URLSearchParams
  | Record<string, string | readonly string[]>
  | readonly (readonly [string, string])[];

type SetSearchParams = (
  next: SearchParamsInit | ((current: URLSearchParams) => SearchParamsInit),
  options?: { replace?: boolean },
) => void;

const createSearchParams = (init: SearchParamsInit): URLSearchParams => {
  if (init instanceof URLSearchParams || typeof init === 'string') {
    return new URLSearchParams(init);
  }

  if (Array.isArray(init)) {
    return new URLSearchParams(init as [string, string][]);
  }

  const params = new URLSearchParams();
  Object.entries(init).forEach(([key, value]) => {
    if (typeof value === 'string') params.set(key, value);
    else value.forEach((item) => params.append(key, item));
  });
  return params;
};

/**
 * List-page filter/sort/page state that lives in the URL, so reload, back
 * navigation, and shared links all restore it (autodrive-6cq.5.8). Extracted
 * from StudentsPage's original inline setParam/setSearchParams pattern —
 * reuse this instead of re-inlining it per page.
 */
export function useUrlParams() {
  const router = useRouter();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.searchStr),
    [location.searchStr],
  );

  const setSearchParams = useCallback<SetSearchParams>(
    (next, options) => {
      const current = new URLSearchParams(router.state.location.searchStr);
      const resolved = typeof next === 'function' ? next(current) : next;
      const nextParams = createSearchParams(resolved);
      const query = nextParams.toString();
      const hash = router.state.location.hash;
      const href = `${router.state.location.pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
      void router.navigate({
        href,
        replace: options?.replace,
        resetScroll: false,
      });
    },
    [router],
  );

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

  return { searchParams, setSearchParams, setParam, setParams };
}
