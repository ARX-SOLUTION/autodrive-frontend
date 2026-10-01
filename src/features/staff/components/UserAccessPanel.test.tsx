import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { StaffAccess, User } from '@/features/staff/types';
import UserAccessPanel from './UserAccessPanel';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));
const target: User = {
  id: 'target',
  email: 'target@example.com',
  role: 'operator',
};
const snapshot: StaffAccess = {
  access_version: 7,
  branch_ids: ['a', 'b'],
  delegations: [],
  permissions: [
    { permission: 'students.read', scope: 'branch', branch_id: 'b' },
  ],
};
const catalogue = {
  permissions: [
    'students.read',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.mark',
    'documents.read',
  ],
  own_resources: ['students', 'attendance'],
  templates: {},
  branches: [
    { id: 'a', name: 'Branch A' },
    { id: 'b', name: 'Branch B' },
  ],
  delegations: [],
};
const mount = () =>
  renderWithRouter(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <UserAccessPanel user={target} />
    </QueryClientProvider>,
  );
const confirmSave = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
  const dialog = await screen.findByRole('dialog', {
    name: 'access.confirm_title',
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'common.save' }));
};

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({
    user: {
      id: 'owner',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company',
      permissions: [],
    },
    activeBranchId: null,
  });
  vi.mocked(axiosInstance.get).mockImplementation(async (url) => ({
    data: url === '/permissions' ? catalogue : snapshot,
  }));
});

describe('staff scoped access editor', () => {
  it('saves an independent update grant only in the changed branch scope', async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({
      data: {
        ...snapshot,
        access_version: 8,
        permissions: [
          ...snapshot.permissions,
          { permission: 'students.update', scope: 'branch', branch_id: 'a' },
        ],
      },
    });
    await mount();
    const scopes = await screen.findByLabelText('access.scope');
    fireEvent.change(scopes, { target: { value: 'branch:a' } });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_update',
      }),
    );
    expect(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_read',
      }),
    ).not.toBeChecked();
    await confirmSave();
    await waitFor(() =>
      expect(axiosInstance.patch).toHaveBeenCalledWith('/users/target/access', {
        version: 7,
        scopes: [
          { scope: 'branch', branchId: 'a', permissions: ['students.update'] },
        ],
      }),
    );
    expect(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_delete',
      }),
    ).not.toBeChecked();
  });

  it('creates a first own grant with its branch and never offers unscoped own access', async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: snapshot });
    await mount();
    const scopes = await screen.findByLabelText('access.scope');
    expect(
      within(scopes).queryByRole('option', { name: 'access.own' }),
    ).not.toBeInTheDocument();
    expect(
      within(scopes).getByRole('option', { name: 'access.own · Branch A' }),
    ).toHaveValue('own:a');
    expect(
      within(scopes).getByRole('option', { name: 'access.own · Branch B' }),
    ).toHaveValue('own:b');
    fireEvent.change(scopes, { target: { value: 'own:a' } });
    expect(
      screen.getByRole('checkbox', {
        name: 'access.permissions.documents_read',
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_update',
      }),
    );
    await confirmSave();
    await waitFor(() =>
      expect(axiosInstance.patch).toHaveBeenCalledWith('/users/target/access', {
        version: 7,
        scopes: [
          { scope: 'own', branchId: 'a', permissions: ['students.update'] },
        ],
      }),
    );
  });

  it('allows a delegated branch ceiling to grant own access only in the same branch', async () => {
    useAuthStore.setState({
      user: {
        id: 'manager',
        email: 'manager@example.com',
        role: 'manager',
        permissions: [],
        branch_ids: ['a', 'b'],
      },
    });
    vi.mocked(axiosInstance.get).mockImplementation(async (url) => ({
      data:
        url === '/permissions'
          ? {
              ...catalogue,
              delegations: [
                {
                  permission: 'students.update',
                  scope: 'branch',
                  branch_id: 'a',
                },
              ],
            }
          : snapshot,
    }));
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: snapshot });
    await mount();
    const scopes = await screen.findByLabelText('access.scope');
    const update = () =>
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_update',
      });
    expect(update()).toBeDisabled();
    fireEvent.change(scopes, { target: { value: 'own:b' } });
    expect(update()).toBeDisabled();
    fireEvent.change(scopes, { target: { value: 'own:a' } });
    expect(update()).toBeEnabled();
    fireEvent.click(update());
    await confirmSave();
    await waitFor(() =>
      expect(axiosInstance.patch).toHaveBeenCalledWith('/users/target/access', {
        version: 7,
        scopes: [
          { scope: 'own', branchId: 'a', permissions: ['students.update'] },
        ],
      }),
    );
  });

  it('reviews exact removed permissions, branch and membership changes without unchanged grants', async () => {
    vi.mocked(axiosInstance.get).mockImplementation(async (url) => ({
      data:
        url === '/permissions'
          ? {
              ...catalogue,
              branches: [
                { id: 'a', name: 'Branch A' },
                { id: 'b', name: 'Minor' },
              ],
            }
          : {
              ...snapshot,
              permissions: [
                ...snapshot.permissions,
                {
                  permission: 'students.create',
                  scope: 'branch',
                  branch_id: 'b',
                },
              ],
            },
    }));
    await mount();
    fireEvent.change(await screen.findByLabelText('access.scope'), {
      target: { value: 'branch:b' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_read',
      }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Branch A' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'access.confirm_title',
    });
    expect(
      within(dialog).getByRole('heading', { name: 'Minor' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'access.removed · access.permissions.students_read',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/access.permissions.students_create/),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText('Branch A · common.inactive'),
    ).toBeInTheDocument();
    expect(axiosInstance.patch).not.toHaveBeenCalled();
  });

  it('uses one checkbox set in responsive resource cards with mobile CRUD labels', async () => {
    await mount();
    await screen.findByLabelText('access.scope');
    const resource = screen.getByText('access.resources.students');
    const row = resource.closest('tr')!;
    expect(row).toHaveClass('grid', 'grid-cols-4', 'md:table-row');
    expect(resource).toHaveClass('col-span-4');
    expect(row.closest('tbody')).toHaveClass('grid', 'md:table-row-group');
    expect(within(row).getAllByRole('checkbox')).toHaveLength(4);
    for (const action of ['read', 'create', 'update', 'delete']) {
      expect(within(row).getByText(`access.actions.${action}`)).toHaveClass(
        'md:hidden',
      );
    }
    expect(
      screen.getAllByRole('checkbox', {
        name: 'access.permissions.students_update',
      }),
    ).toHaveLength(1);
  });

  it('retains a draft on 409 and reloads only after explicit discard', async () => {
    vi.mocked(axiosInstance.patch).mockRejectedValue({
      response: { status: 409 },
    });
    await mount();
    await screen.findByLabelText('access.scope');
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_create',
      }),
    );
    await confirmSave();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'access.conflict',
    );
    expect(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_create',
      }),
    ).toBeChecked();
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'access.reload' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'access.discard_title',
    });
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'access.reload' }),
    );
    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledTimes(3));
    expect(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_create',
      }),
    ).not.toBeChecked();
  });
});
