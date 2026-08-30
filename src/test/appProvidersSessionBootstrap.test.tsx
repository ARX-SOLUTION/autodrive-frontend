import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/AppProviders';
import { useAuthStore } from '@/store/authStore';

const restore = vi.hoisted(() => ({ isLoading: true, calls: 0 }));

vi.mock('@/services/authService', () => ({
  useRestoreSession: () => {
    restore.calls += 1;
    return { isLoading: restore.isLoading };
  },
}));
vi.mock('@/app/DeferredFeedback', () => ({
  DeferredFeedback: () => null,
}));

beforeEach(() => {
  restore.isLoading = true;
  restore.calls = 0;
  useAuthStore.setState({
    token: null,
    user: { id: 'owner-1', email: 'owner@example.com', role: 'owner' },
    isAuthenticated: true,
    hasHydrated: true,
  });
});

afterEach(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    hasHydrated: true,
  });
});

it('holds the route tree until a persisted cookie session is restored', () => {
  const app = (
    <AppProviders>
      <div>Route tree</div>
    </AppProviders>
  );
  const view = render(app);

  expect(restore.calls).toBeGreaterThan(0);
  expect(screen.getByText('Sessiya tiklanmoqda...')).toBeInTheDocument();
  expect(screen.queryByText('Route tree')).not.toBeInTheDocument();

  restore.isLoading = false;
  view.rerender(
    <AppProviders>
      <div>Route tree</div>
    </AppProviders>,
  );
  expect(screen.getByText('Route tree')).toBeInTheDocument();
  view.unmount();
});
