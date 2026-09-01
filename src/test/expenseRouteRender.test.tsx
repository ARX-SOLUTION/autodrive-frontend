import { cleanup, render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: () => <Outlet />,
}));
vi.mock('@/pages/ExpensesPage', () => ({
  default: () => <p>expense-list</p>,
}));
vi.mock('@/pages/ExpenseDetailPage', () => ({
  default: () => <p>expense-detail</p>,
}));

afterEach(() => {
  cleanup();
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    hasHydrated: false,
  });
});

describe('expense route rendering', () => {
  it('renders the detail component at /expenses/:id', async () => {
    useAuthStore.setState({
      token: 'test-token',
      user: {
        id: 'owner-1',
        email: 'owner@example.test',
        name: 'Owner',
        role: 'owner',
        company_id: 'company-1',
      } as never,
      isAuthenticated: true,
      hasHydrated: true,
    });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ['/expenses/expense-1'] }),
    );

    await router.load();
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('expense-detail')).toBeInTheDocument();
    expect(screen.queryByText('expense-list')).not.toBeInTheDocument();
  });
});
