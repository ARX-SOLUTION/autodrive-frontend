import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import { queryClient } from '@/lib/queryClient';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { AuthResponse } from '@/types/user';

const loginMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));
const track = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());

vi.mock('@/services/authService', () => ({
  useLogin: () => loginMutation,
}));
vi.mock('@/lib/umami', () => ({ track, initUmami: vi.fn() }));
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

const authResponse: AuthResponse = {
  token: 'demo-token',
  user: {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@automaktab.uz',
    role: 'owner',
  },
};

describe('LoginPage demo intent', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { hostname: 'app.automaktab.uz', href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('logs into the synthetic demo once and tracks entry only after success', async () => {
    loginMutation.mutate.mockImplementation(
      (
        _credentials: unknown,
        options: { onSuccess: (data: AuthResponse) => void },
      ) => options.onSuccess(authResponse),
    );

    const { router } = await renderWithRouter(<LoginPage />, {
      initialEntry: '/login?demo=1',
      routePattern: '/login',
    });

    await waitFor(() => expect(loginMutation.mutate).toHaveBeenCalledOnce());
    expect(loginMutation.mutate.mock.calls[0][0]).toEqual({
      email: 'demo@automaktab.uz',
      password: 'demo1234',
    });
    expect(track).toHaveBeenCalledWith('demo_enter', { locale: 'uz' });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboard'),
    );
  });

  it('does not auto-retry after failure and leaves a manual retry action', async () => {
    loginMutation.mutate.mockImplementation(
      (_credentials: unknown, options: { onError: (error: unknown) => void }) =>
        options.onError({ response: { status: 401 } }),
    );

    const view = await renderWithRouter(<LoginPage />, {
      initialEntry: '/login?demo=1',
      routePattern: '/login',
    });

    await waitFor(() => expect(loginMutation.mutate).toHaveBeenCalledOnce());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'login.demo_auto_error',
    );
    expect(track).not.toHaveBeenCalled();

    view.rerender(<LoginPage />);
    expect(loginMutation.mutate).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'login.demo_retry' }));
    expect(loginMutation.mutate).toHaveBeenCalledTimes(2);
  });
});
