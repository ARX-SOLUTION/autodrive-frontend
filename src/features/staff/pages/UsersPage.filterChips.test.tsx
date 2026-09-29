import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsersPage from '@/features/staff/pages/UsersPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { User } from '@/features/staff/types';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null } }),
}));

vi.mock('@/features/staff/api/userService', () => ({
  useUsersPage: () => ({
    data: {
      data: [
        {
          id: 'u1',
          name: 'Nigora Karimova',
          email: 'nigora@example.com',
          role: 'manager',
          branch_id: 'b1',
          branch_name: 'Yunusobod',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ] as User[],
      meta: { total: 1, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateCompanyUser: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeUserLifecycle: () => ({ mutate: vi.fn(), isPending: false }),
  useRestoreUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

afterEach(() => {
  cleanup();
});

describe('UsersPage filter chips and URL hydration', () => {
  it('hydrates filters from URL and renders active filter chips', async () => {
    await renderWithRouter(<UsersPage />, {
      initialEntry: '/users?q=nigora&role=accountant&is_active=true',
      routePattern: '/users',
    });

    const searchChip = screen.getByTestId('active-filter-chip-search');
    const roleChip = screen.getByTestId('active-filter-chip-role');
    const statusChip = screen.getByTestId('active-filter-chip-status');

    expect(searchChip.textContent).toContain('nigora');
    expect(roleChip.textContent).toContain('roles.accountant');
    expect(statusChip.textContent).toContain('common.active');

    // Remove status chip
    const removeBtn = statusChip.querySelector('button')!;
    fireEvent.click(removeBtn);
    expect(screen.queryByTestId('active-filter-chip-status')).toBeNull();
  });
});
