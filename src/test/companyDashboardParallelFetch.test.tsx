import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import CompanyRevenueDashboard from '@/pages/dashboard/CompanyRevenueDashboard';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(() => new Promise(() => {})) },
}));

const owner: User = {
  id: 'owner-1',
  email: 'demo@automaktab.uz',
  name: 'Demo Owner',
  role: 'owner',
};

const operator: User = {
  id: 'operator-1',
  email: 'operator@automaktab.uz',
  name: 'Operator',
  role: 'operator',
  branch_id: 'branch-1',
};

const renderDashboard = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <CompanyRevenueDashboard />
    </QueryClientProvider>,
    {
      initialEntry: '/dashboard',
      routePattern: '/dashboard',
    },
  );
};

const requestedUrls = () =>
  vi.mocked(axiosInstance.get).mock.calls.map((call) => call[0]);

describe('company dashboard parallel fetches', () => {
  afterEach(() => {
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  it('starts finance and expense GETs while company overview is still in flight', async () => {
    useAuthStore.getState().setAuth('token', owner);

    const view = await renderDashboard();

    await waitFor(() => {
      expect(requestedUrls()).toEqual(
        expect.arrayContaining([
          '/dashboard/company-overview',
          '/dashboard/finance-summary',
          '/dashboard/expense-breakdown',
        ]),
      );
    });
    expect(view.container.querySelector('.animate-pulse')).toBeTruthy();
    expect(view.queryByTestId('finance-summary-section')).toBeNull();
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/dashboard/finance-summary',
      expect.objectContaining({
        params: expect.objectContaining({
          from: expect.stringMatching(/^\d{4}-\d{2}-01$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      }),
    );
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/dashboard/expense-breakdown',
      expect.objectContaining({
        params: expect.objectContaining({
          from: expect.stringMatching(/^\d{4}-\d{2}-01$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      }),
    );
  });

  it('does not start finance GETs for roles that never see the finance section', async () => {
    useAuthStore.getState().setAuth('token', operator);

    await renderDashboard();

    await waitFor(() => {
      expect(requestedUrls()).toContain('/dashboard/company-overview');
    });
    expect(requestedUrls()).not.toContain('/dashboard/finance-summary');
    expect(requestedUrls()).not.toContain('/dashboard/expense-breakdown');
  });
});
