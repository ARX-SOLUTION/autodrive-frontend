import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { SessionBootstrap } from '@/app/AppProviders';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/services/authService';
import { requireAuthenticated } from '@/app/routeGuards';
import LoginPage from '@/pages/LoginPage';

// Regression for the logout "hang": ProtectedRoute must not drive an infinite
// load/redirect loop. <Navigate> re-navigates on every render (its props
// identity changes while the component subscribes to the router store), so
// flipping `isAuthenticated` at logout/session-expiry ran loadClientRoute
// forever and React threw "Maximum update depth exceeded".
//
// The guard gate renders a neutral spinner and lets `router.invalidate()`
// re-run `requireAuthenticated`, which throws the redirect to /login.

vi.mock('@/lib/umami', () => ({ track: vi.fn(), initUmami: vi.fn() }));

const axiosPost = vi.fn();
const axiosGet = vi.fn();
vi.mock('@/api/axiosInstance', () => ({
  default: {
    post: (...args: unknown[]) => axiosPost(...args),
    get: (...args: unknown[]) => axiosGet(...args),
  },
}));

const LogoutProbe = () => {
  const m = useLogout();
  return <button onClick={() => m.mutate()}>logout</button>;
};

const makeRouter = () => {
  const root = createRootRoute({ component: Outlet });
  const login = createRoute({
    getParentRoute: () => root,
    path: '/login',
    component: LoginPage,
  });
  const auth = createRoute({
    getParentRoute: () => root,
    path: '/_auth',
    beforeLoad: ({ location }) => requireAuthenticated(location),
    component: Outlet,
  });
  const dash = createRoute({
    getParentRoute: () => auth,
    path: '/dashboard',
    component: () => (
      <ProtectedRoute>
        <LogoutProbe />
      </ProtectedRoute>
    ),
  });
  return createRouter({
    routeTree: root.addChildren([login, auth.addChildren([dash])]),
    history: createMemoryHistory({ initialEntries: ['/_auth/dashboard'] }),
  });
};

describe('ProtectedRoute logout redirect', () => {
  let router: ReturnType<typeof makeRouter>;
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      user: {
        id: 'u1',
        email: 'demo@automaktab.uz',
        name: 'Demo',
        role: 'manager',
        company_id: 'c1',
      } as never,
      isAuthenticated: true,
      hasHydrated: true,
    });
    axiosGet.mockImplementation(async (url: string) => {
      if (url.includes('/auth/me')) {
        return {
          data: {
            success: true,
            data: {
              id: 'u1',
              role: 'manager',
              company_id: 'c1',
            },
          },
        };
      }
      return { data: { success: true, data: [] } };
    });
    axiosPost.mockResolvedValue({ status: 204, data: '' });
    router = makeRouter();
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('redirects to /login after logout without an infinite render loop', async () => {
    const consoleSpy = vi.spyOn(console, 'error');

    await router.load();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText('logout')).toBeTruthy());

    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'), {
      timeout: 2000,
    });

    const loopErrors = consoleSpy.mock.calls.filter((args) =>
      String(args[0]).includes('Maximum update depth'),
    );
    expect(loopErrors).toHaveLength(0);

    view.unmount();
    consoleSpy.mockRestore();
  });
});
