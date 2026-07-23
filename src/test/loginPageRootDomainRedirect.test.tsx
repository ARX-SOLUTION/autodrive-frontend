import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';

// autodrive-dtj.2: root domain (automaktab.uz) has no app UI of its own, so
// a successful login there must hand off to app.automaktab.uz with a full
// navigation (carries the domain-wide auth cookie). Every other host --
// app./admin. subdomains, local dev, Vercel previews -- keeps the existing
// in-SPA navigate() untouched.

const navigateMock = vi.fn();

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

const renderLogin = (from: string) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}>
      <LoginPage />
    </MemoryRouter>,
  );

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
    vi.clearAllMocks();
    cleanup();
  });

  it('full-navigates to app.<domain> with the preserved `from` path on the root domain', async () => {
    setHostname('automaktab.uz');
    renderLogin('/students/42');

    submitLogin();

    // react-hook-form's handleSubmit resolves the zod schema asynchronously,
    // so the mutate() call (and thus the redirect) lands a tick after click.
    await waitFor(() =>
      expect(window.location.href).toBe(
        'https://app.automaktab.uz/students/42',
      ),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('keeps the plain navigate() on non-root hosts', async () => {
    setHostname('app.automaktab.uz');
    renderLogin('/students/42');

    submitLogin();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/students/42'),
    );
    expect(window.location.href).toBe('');
  });
});
