import { render, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';

// autodrive-dtj.2: root-domain "already authenticated" guard. LandingPage
// already redirected an authenticated visitor to /dashboard via navigate();
// this only adds a root-domain branch (full navigation to app., since the
// root has no app UI). Locks down the two ways this could go wrong: firing
// before the auth store finishes rehydrating (bounces a logged-out user)
// and firing for an unauthenticated visitor.

let authState = { isAuthenticated: false, hasHydrated: false };
const navigateMock = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(authState),
}));
vi.mock('@/services/blogService', () => ({
  useBlogPosts: () => ({ data: [] }),
}));
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { ...actual, useNavigate: () => navigateMock };
});

const setHostname = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    value: { hostname, href: '' },
    writable: true,
    configurable: true,
  });
};

const renderLanding = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('LandingPage root-domain auth guard (autodrive-dtj.2)', () => {
  afterEach(() => {
    authState = { isAuthenticated: false, hasHydrated: false };
    vi.clearAllMocks();
    cleanup();
  });

  it('full-navigates to app.<domain>/dashboard once authenticated + hydrated on the root domain', async () => {
    setHostname('automaktab.uz');
    authState = { isAuthenticated: true, hasHydrated: true };

    renderLanding();

    await waitFor(() =>
      expect(window.location.href).toBe('https://app.automaktab.uz/dashboard'),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not redirect before hasHydrated, even if authenticated on the root domain', () => {
    setHostname('automaktab.uz');
    authState = { isAuthenticated: true, hasHydrated: false };

    renderLanding();

    expect(window.location.href).toBe('');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not redirect an unauthenticated visitor on the root domain', () => {
    setHostname('automaktab.uz');
    authState = { isAuthenticated: false, hasHydrated: true };

    renderLanding();

    expect(window.location.href).toBe('');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('keeps the existing in-app navigate() on non-root hosts (regression)', async () => {
    setHostname('localhost');
    authState = { isAuthenticated: true, hasHydrated: true };

    renderLanding();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      }),
    );
    expect(window.location.href).toBe('');
  });
});
