/* eslint-disable react-refresh/only-export-components -- Test-only router factories intentionally colocate their wrapper components. */

import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';

export interface TestRouterOptions {
  initialEntry?: string;
  initialState?: unknown;
  routePattern?: string;
  params?: Record<string, string>;
}

const TestRouteContent = createContext<ReactNode>(null);

const TestRoute = () => useContext(TestRouteContent);

const fillRouteParams = (
  routePattern: string,
  params: Record<string, string>,
) => {
  const withNamedParams = routePattern.replace(
    /\$([A-Za-z0-9_]+)/g,
    (_match, key: string) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error(`Missing test route param: ${key}`);
      }
      return encodeURIComponent(value);
    },
  );

  return withNamedParams.replace(/\$(?=\/|$)/g, () => {
    const value = params._splat;
    if (value === undefined) {
      throw new Error('Missing test route param: _splat');
    }
    return value
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  });
};

export const createTestRouter = ({
  initialEntry,
  initialState,
  routePattern = '/',
  params = {},
}: TestRouterOptions = {}) => {
  const resolvedEntry = initialEntry ?? fillRouteParams(routePattern, params);
  const history = createMemoryHistory({ initialEntries: [resolvedEntry] });

  if (initialState !== undefined) {
    history.replace(resolvedEntry, initialState);
  }

  const rootRoute = createRootRoute({ component: Outlet });
  const contentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: routePattern,
    component: TestRoute,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([contentRoute]),
    history,
    defaultPreload: 'intent',
  });
};

export type TestRouter = ReturnType<typeof createTestRouter>;

const TestRouterProvider = ({
  router,
  children,
}: PropsWithChildren<{ router: TestRouter }>) => (
  <TestRouteContent.Provider value={children}>
    <RouterProvider router={router} />
  </TestRouteContent.Provider>
);

export type RenderWithRouterOptions = TestRouterOptions &
  Omit<RenderOptions, 'wrapper'>;

export type RenderWithRouterResult = RenderResult & { router: TestRouter };

export const renderWithRouter = async (
  ui: ReactElement,
  options: RenderWithRouterOptions = {},
): Promise<RenderWithRouterResult> => {
  const { initialEntry, initialState, routePattern, params, ...renderOptions } =
    options;
  const router = createTestRouter({
    initialEntry,
    initialState,
    routePattern,
    params,
  });
  await router.load();
  const result = render(
    <TestRouterProvider router={router}>{ui}</TestRouterProvider>,
    renderOptions,
  );

  return {
    ...result,
    rerender: (nextUi) =>
      result.rerender(
        <TestRouterProvider router={router}>{nextUi}</TestRouterProvider>,
      ),
    router,
  };
};

export const createRouterTestWrapper = async (
  options: TestRouterOptions = {},
) => {
  const router = createTestRouter(options);
  await router.load();
  const wrapper = ({ children }: PropsWithChildren) => (
    <TestRouterProvider router={router}>{children}</TestRouterProvider>
  );

  return { router, wrapper };
};
