import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import { queryClient } from '@/lib/queryClient';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-dtj.2: root domain (automaktab.uz) has no app UI of its own, so
// a successful login there must hand off to app.automaktab.uz with a full
// navigation (carries the domain-wide auth cookie). Every other host --
// app./admin. subdomains, local dev, Vercel previews -- keeps the existing
// in-SPA navigate() untouched.

vi.mock('@/services/authService', () => ({
  useLogin: () => ({
    mutate: (
      _vars: unknown,
      opts: { onSuccess: () => void; onError: (e: unknown) => void },
    ) => opts.onSuccess(),
    isPending: false,
  }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ logout: vi.fn() }),
}));

const setHostname = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    value: { hostname, href: '' },
    writable: true,
    configurable: true,
  });
};

const renderLogin = (from: string) =>
  renderWithRouter(<LoginPage />, {
    initialEntry: '/login',
    initialState: { from },
    routePattern: '/login',
  });

const submitLogin = () => {
  fireEvent.change(screen.getByLabelText('login.email_label'), {
    target: { value: 'demo@automaktab.uz' },
  });
  fireEvent.change(screen.getByLabelText('login.password_label'), {
    target: { value: 'demo1234' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));
};

describe('LoginPage root-domain redirect (autodrive-dtj.2)', () => {
  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    cleanup();
  });

  it('clears cached tenant data when the login page mounts', async () => {
    setHostname('app.automaktab.uz');
    queryClient.setQueryData(['students', 'page'], { id: 'previous-tenant' });

    await renderLogin('/dashboard');

    await waitFor(() =>
      expect(queryClient.getQueryData(['students', 'page'])).toBeUndefined(),
    );
  });

  it('full-navigates to app.<domain> with the preserved `from` path on the root domain', async () => {
    setHostname('automaktab.uz');
    const { router } = await renderLogin('/students/42');

    submitLogin();

    // react-hook-form's handleSubmit resolves the zod schema asynchronously,
    // so the mutate() call (and thus the redirect) lands a tick after click.
    await waitFor(() =>
      expect(window.location.href).toBe(
        'https://app.automaktab.uz/students/42',
      ),
    );
    expect(router.state.location.pathname).toBe('/login');
  });

  it('keeps the plain navigate() on non-root hosts', async () => {
    setHostname('app.automaktab.uz');
    const { router } = await renderLogin('/students/42');

    submitLogin();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students/42'),
    );
    expect(window.location.href).toBe('');

    router.history.back();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students/42'),
    );
  });
});
