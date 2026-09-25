import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from 'next-themes';
import LoginPage from '@/pages/LoginPage';
import { getLoginCopy } from '@/pages/loginCopy';
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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const copy = getLoginCopy('uz');

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
    vi.unstubAllEnvs();
  });

  const enableOneClickDemo = (password = 'env-demo-secret') => {
    vi.stubEnv('VITE_ENABLE_DEMO_LOGIN', 'true');
    vi.stubEnv('VITE_DEMO_PASSWORD', password);
  };

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
      await screen.findByRole('button', { name: copy.themeDark }),
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    fireEvent.click(screen.getByRole('button', { name: copy.themeLight }));
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

    expect(screen.getByRole('main')).toHaveAccessibleName(copy.title);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      copy.title,
    );
    expect(screen.getByLabelText(copy.emailLabel)).toHaveAttribute(
      'autocomplete',
      'email',
    );
    const password = screen.getByLabelText(copy.passwordLabel);
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: copy.showPassword }));
    expect(password).toHaveAttribute('type', 'text');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
  });

  it('announces pending sign-in and prevents repeated login or demo submission', async () => {
    loginMutation.isPending = true;
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    expect(screen.getByRole('status')).toHaveTextContent(copy.submitting);
    expect(
      screen.getByRole('button', { name: copy.submitting }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: copy.demo })).toBeDisabled();
  });

  it('requires email and password before calling login', async () => {
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    fireEvent.click(screen.getByRole('button', { name: copy.submit }));
    expect(screen.getAllByText(copy.required)).toHaveLength(2);
    expect(loginMutation.mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(copy.emailLabel), {
      target: { value: 'staff@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.submit }));
    expect(screen.getAllByText(copy.required)).toHaveLength(1);
    expect(loginMutation.mutate).not.toHaveBeenCalled();
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

    fireEvent.change(screen.getByLabelText(copy.emailLabel), {
      target: { value: 'staff@example.com' },
    });
    fireEvent.change(screen.getByLabelText(copy.passwordLabel), {
      target: { value: 'example-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.submit }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.error);
    fireEvent.change(screen.getByLabelText(copy.passwordLabel), {
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
      expect(screen.getByLabelText(copy.emailLabel)).toHaveValue(
        'demo@automaktab.uz',
      ),
    );
    expect(screen.getByLabelText(copy.passwordLabel)).toHaveValue('');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
  });

  it('fills only the demo email when the demo button is clicked', async () => {
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    fireEvent.change(screen.getByLabelText(copy.passwordLabel), {
      target: { value: 'temporary' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.demo }));

    expect(screen.getByLabelText(copy.emailLabel)).toHaveValue(
      'demo@automaktab.uz',
    );
    expect(screen.getByLabelText(copy.passwordLabel)).toHaveValue('');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
  });

  it('keeps email-only demo when the password is set without the enable flag', async () => {
    vi.stubEnv('VITE_DEMO_PASSWORD', 'env-demo-secret');
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login?demo=1',
      routePattern: '/login',
    });

    await waitFor(() =>
      expect(screen.getByLabelText(copy.emailLabel)).toHaveValue(
        'demo@automaktab.uz',
      ),
    );
    expect(screen.getByLabelText(copy.passwordLabel)).toHaveValue('');
    expect(loginMutation.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: copy.demo })).toBeInTheDocument();
  });

  it('signs in with the env password when one-click demo is enabled', async () => {
    enableOneClickDemo();
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login',
      routePattern: '/login',
    });

    fireEvent.click(screen.getByRole('button', { name: copy.demoSignIn }));

    expect(loginMutation.mutate).toHaveBeenCalledWith(
      { email: 'demo@automaktab.uz', password: 'env-demo-secret' },
      expect.any(Object),
    );
    expect(screen.getByLabelText(copy.passwordLabel)).toHaveValue('');
    expect(screen.getByText(copy.demoSignInHint)).toBeInTheDocument();
  });

  it('submits one-click demo login from ?demo=1 when the production env is set', async () => {
    enableOneClickDemo('another-env-secret');
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login?demo=1',
      routePattern: '/login',
    });

    await waitFor(() =>
      expect(loginMutation.mutate).toHaveBeenCalledWith(
        { email: 'demo@automaktab.uz', password: 'another-env-secret' },
        expect.any(Object),
      ),
    );
    expect(screen.getByLabelText(copy.passwordLabel)).toHaveValue('');
  });

  it('shows a retry when automatic one-click demo login fails', async () => {
    enableOneClickDemo();
    loginMutation.mutate.mockImplementation(
      (_credentials: unknown, options: { onError: (error: unknown) => void }) =>
        options.onError({ response: { status: 401 } }),
    );
    await renderWithRouter(<LoginPage />, {
      initialEntry: '/login?demo=1',
      routePattern: '/login',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      copy.demoAutoError,
    );
    expect(
      screen.getByRole('button', { name: copy.demoRetry }),
    ).toBeInTheDocument();
    expect(screen.queryByText(copy.error)).not.toBeInTheDocument();
  });
});
