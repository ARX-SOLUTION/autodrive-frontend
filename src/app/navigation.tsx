/* eslint-disable react-refresh/only-export-components -- migration seam intentionally exports Link plus router hooks */

import { forwardRef, useCallback, useMemo, type ComponentProps } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useParams as useRouterParams,
  useRouter,
} from '@tanstack/react-router';

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

type SearchParamsInit =
  | string
  | URLSearchParams
  | Record<string, string | readonly string[]>
  | readonly (readonly [string, string])[];

type SetSearchParams = (
  next: SearchParamsInit | ((current: URLSearchParams) => SearchParamsInit),
  options?: Pick<NavigateOptions, 'replace'>,
) => void;

type AppLinkProps = Omit<ComponentProps<typeof RouterLink>, 'to'> & {
  to: string;
};

/**
 * Dynamic entity URLs are assembled by current feature pages. New route code
 * should use TanStack's typed Link directly instead of broadening this seam.
 */
export const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ to, ...props }, ref) => (
    <RouterLink ref={ref} to={to as never} {...props} />
  ),
);
Link.displayName = 'AppLink';

/** Legacy call shape for incremental feature migration: navigate('/path'). */
export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string | number, options: NavigateOptions = {}) => {
      if (typeof to === 'number') {
        router.history.go(to);
        return;
      }

      void router.navigate({
        to: to as never,
        replace: options.replace,
        state: options.state as never,
      });
    },
    [router],
  );
}

export function useParams<T extends Record<string, string | undefined>>() {
  return useRouterParams({ strict: false } as never) as T;
}

function createSearchParams(init: SearchParamsInit): URLSearchParams {
  if (init instanceof URLSearchParams || typeof init === 'string') {
    return new URLSearchParams(init);
  }

  if (Array.isArray(init)) {
    return new URLSearchParams(init as [string, string][]);
  }

  const params = new URLSearchParams();
  Object.entries(init).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      value.forEach((item) => params.append(key, item));
    } else {
      params.set(key, value);
    }
  });
  return params;
}

/**
 * URLSearchParams compatibility for existing server-filtered lists. New route
 * slices validate typed search at the route boundary.
 */
export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const router = useRouter();
  const location = useLocation();
  const params = useMemo(
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
        to: href as never,
        replace: options?.replace,
        resetScroll: false,
      });
    },
    [router],
  );

  return [params, setSearchParams];
}

export { useLocation };
