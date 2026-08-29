import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OperatorsPage from '@/pages/OperatorsPage';
import TeachersPage from '@/pages/TeachersPage';
import UsersPage from '@/pages/UsersPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { User } from '@/types/user';

const h = vi.hoisted(() => ({
  useUsersPage: vi.fn(),
  useTeachersPage: vi.fn(),
  useOperatorsPage: vi.fn(),
  idleMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null } }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

vi.mock('@/services/userService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/userService')>();
  return {
    ...actual,
    useUsersPage: h.useUsersPage,
    useCreateManager: h.idleMutation,
    useUpdateUser: h.idleMutation,
    useDeleteUser: h.idleMutation,
    useRestoreUser: h.idleMutation,
  };
});

vi.mock('@/services/teacherService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/teacherService')>();
  return {
    ...actual,
    useTeachersPage: h.useTeachersPage,
    useCreateTeacher: h.idleMutation,
    useUpdateTeacher: h.idleMutation,
    useDeleteTeacher: h.idleMutation,
  };
});

vi.mock('@/services/operatorService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/operatorService')>();
  return {
    ...actual,
    useOperatorsPage: h.useOperatorsPage,
    useCreateOperator: h.idleMutation,
    useUpdateOperator: h.idleMutation,
    useDeleteOperator: h.idleMutation,
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

const pageResult = (data: User[], page: number, totalPages = 3) => ({
  data: {
    data,
    meta: {
      total: totalPages * 25,
      page,
      limit: 25,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
});

const manager: User = {
  id: 'm1',
  name: 'Nigora',
  email: 'nigora@example.com',
  role: 'manager',
  branch_id: 'b1',
  branch_name: 'Yunusobod',
  is_active: true,
};

const teachers: User[] = [
  {
    id: 't-zara',
    name: 'Zara',
    email: 'zara@example.com',
    phone: '+998901111111',
    role: 'teacher',
    specialization: 'THEORY',
    branch_id: 'b1',
    is_active: true,
  },
  {
    id: 't-ali',
    name: 'Ali',
    email: 'ali@example.com',
    phone: '+998902222222',
    role: 'teacher',
    specialization: 'PRACTICE',
    branch_id: 'b1',
    is_active: true,
  },
];

const operator: User = {
  id: 'o1',
  name: 'Malika',
  email: 'malika@example.com',
  phone: '+998903333333',
  role: 'operator',
  branch_id: 'b1',
  is_active: true,
  registered_students_count: 12,
  payment_follow_through_rate: 75,
};

beforeEach(() => {
  h.useUsersPage.mockImplementation((_role: string, page: number) =>
    pageResult([manager], page),
  );
  h.useTeachersPage.mockImplementation((page: number) =>
    pageResult(teachers, page),
  );
  h.useOperatorsPage.mockImplementation((page: number) =>
    pageResult([operator], page),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Staff DataGrid server ownership', () => {
  it('keeps the UsersPage deep-linked page and forwards server filters', async () => {
    await renderWithRouter(<UsersPage />, {
      initialEntry: '/users?page=2&q=nigora&branch_id=b1&is_active=true',
      routePattern: '/users',
    });

    expect(h.useUsersPage).toHaveBeenLastCalledWith('manager', 2, 25, {
      search: 'nigora',
      branchId: 'b1',
      isActive: true,
      includeDeleted: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

    await waitFor(() =>
      expect(h.useUsersPage).toHaveBeenLastCalledWith(
        'manager',
        3,
        25,
        expect.objectContaining({ search: 'nigora' }),
      ),
    );
  });

  it('sorts only the current teacher page and never forwards sort to the service', async () => {
    const { router } = await renderWithRouter(<TeachersPage />, {
      initialEntry: '/oqituvchilar?page=2&q=ali&sort_by=name&sort_dir=asc',
      routePattern: '/oqituvchilar',
    });

    expect(h.useTeachersPage).toHaveBeenLastCalledWith(2, 25, 'ali');
    const table = screen.getByRole('table', { name: 'teachers.title' });
    let rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Ali');
    expect(rows[1]).toHaveTextContent('Zara');

    fireEvent.click(
      within(table).getByRole('button', { name: 'teachers.first_name' }),
    );

    await waitFor(() =>
      expect(router.state.location.searchStr).toContain('sort_dir=desc'),
    );
    rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Zara');
    expect(h.useTeachersPage).toHaveBeenLastCalledWith(2, 25, 'ali');
  });

  it('uses server paging and search for operators without a sort argument', async () => {
    await renderWithRouter(<OperatorsPage />, {
      initialEntry: '/operatorlar?page=2&q=malika',
      routePattern: '/operatorlar',
    });

    expect(h.useOperatorsPage).toHaveBeenLastCalledWith(2, 25, 'malika');
    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

    await waitFor(() =>
      expect(h.useOperatorsPage).toHaveBeenLastCalledWith(3, 25, 'malika'),
    );
  });
});

describe('TeachersPage financial boundary', () => {
  it('does not render monetary fields even if an unsafe fixture contains them', async () => {
    const unsafeTeacher = {
      ...teachers[0],
      total_price: 987_654_321,
      debt: 123_456_789,
      payment_follow_through_rate: 73,
    } as User;
    h.useTeachersPage.mockReturnValue(pageResult([unsafeTeacher], 1, 1));

    await renderWithRouter(<TeachersPage />, {
      initialEntry: '/oqituvchilar',
      routePattern: '/oqituvchilar',
    });

    expect(screen.queryByText(/987.?654.?321/)).toBeNull();
    expect(screen.queryByText(/123.?456.?789/)).toBeNull();
    expect(screen.queryByText('73%')).toBeNull();
    expect(screen.queryByText('operators.follow_through_rate')).toBeNull();
  });
});
