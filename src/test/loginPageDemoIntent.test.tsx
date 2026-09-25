import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from 'next-themes';
import LoginPage from '@/pages/LoginPage';
import { queryClient } from '@/lib/queryClient';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const loginMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));
const logout = vi.hoisted(() => vi.fn());

vi.mock('@/services/authService', () => ({
  useLogin: () => loginMutation,
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ isAuthenticated: false, logout }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'uz', resolvedLanguage: 'uz' },
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('LoginPage demo intent', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    loginMutation.isPending = false;
    loginMutation.mutate.mockReset();
    Object.defineProperty(window, 'location', {
      value: { hostname: 'app.automaktab.uz', href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('switches between light and dark without submitting the login form', async () => {
    await renderWithRouter(
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="login-theme-test"
      >
        <LoginPage />
      </ThemeProvider>,
      { initialEntry: '/login', routePattern: '/login' },
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'actions.theme_dark' }),
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    fireEvent.click(
      screen.getByRole('button', { name: 'actions.theme_light' }),
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    expect(loginMutation.mutate).not.toHaveBeenCalled();
    localStorage.removeItem('login-theme-test');
    document.documentElement.classList.remove('light');
  });

  it('provides a named login landmark and preserves autofill and password visibility', async () => {
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    expect(screen.getByRole('main')).toHaveAccessibleName('login.title');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'login.title',
    );
    expect(screen.getByLabelText('login.email_label')).toHaveAttribute(
      'autocomplete',
      'email',
    );
    const password = screen.getByLabelText('login.password_label');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(
      screen.getByRole('button', { name: 'common.show_password' }),
    );
    expect(password).toHaveAttribute('type', 'text');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
  });

  it('announces pending sign-in and prevents repeated login or demo submission', async () => {
    loginMutation.isPending = true;
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    expect(screen.getByRole('status')).toHaveTextContent('login.submitting');
    expect(
      screen.getByRole('button', { name: 'login.submitting' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'login.demo' })).toBeDisabled();
  });

  it('keeps credential errors visible and clears them when the user edits', async () => {
    loginMutation.mutate.mockImplementation(
      (_credentials: unknown, options: { onError: (error: unknown) => void }) =>
        options.onError({ response: { status: 401 } }),
    );
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    fireEvent.change(screen.getByLabelText('login.email_label'), {
      target: { value: 'staff@example.com' },
    });
    fireEvent.change(screen.getByLabelText('login.password_label'), {
      target: { value: 'example-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('login.error');
    fireEvent.change(screen.getByLabelText('login.password_label'), {
      target: { value: 'corrected-password' },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prefills demo email from ?demo=1 without submitting or embedding a password', async () => {
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login?demo=1',
      routePattern: '/login',
    });

    await waitFor(() =>
      expect(screen.getByLabelText('login.email_label')).toHaveValue(
        'demo@automaktab.uz',
      ),
    );
    expect(screen.getByLabelText('login.password_label')).toHaveValue('');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
  });

  it('fills only the demo email when the demo button is clicked', async () => {
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    fireEvent.change(screen.getByLabelText('login.password_label'), {
      target: { value: 'temporary' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.demo' }));

    expect(screen.getByLabelText('login.email_label')).toHaveValue(
      'demo@automaktab.uz',
    );
    expect(screen.getByLabelText('login.password_label')).toHaveValue('');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
  });
});
