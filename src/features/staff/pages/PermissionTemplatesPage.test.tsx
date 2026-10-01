import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import PermissionTemplatesPage from './PermissionTemplatesPage';

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const catalogue = {
  permissions: ['students.read', 'students.create', 'payments.read'],
  own_resources: ['students'],
  templates: { teacher: ['students.read'] },
  custom_templates: [],
  branches: [],
  delegations: [],
};

const mount = () =>
  renderWithRouter(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PermissionTemplatesPage />
    </QueryClientProvider>,
    { routePattern: '/permission-templates' },
  );

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
  vi.mocked(axiosInstance.get).mockResolvedValue({ data: catalogue });
  vi.mocked(axiosInstance.post).mockResolvedValue({
    data: {
      id: 'template-1',
      name: 'Operator yordamchisi',
      permissions: ['students.read'],
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
    },
  });
});

describe('permission template management', () => {
  it('creates a company template from selected catalogue permissions', async () => {
    await mount();
    fireEvent.click(
      (
        await screen.findAllByRole('button', { name: 'access.create_template' })
      )[0],
    );
    fireEvent.change(await screen.findByLabelText('access.template_name'), {
      target: { value: 'Operator yordamchisi' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'access.permissions.students_read',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() =>
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/permissions/templates',
        {
          name: 'Operator yordamchisi',
          permissions: ['students.read'],
        },
      ),
    );
  });

  it('keeps template management owner-only in the page itself', async () => {
    useAuthStore.setState({
      user: {
        id: 'manager',
        email: 'manager@example.com',
        role: 'manager',
        permissions: [],
      },
    });
    await mount();
    expect(
      await screen.findByText('access.owner_only_templates'),
    ).toBeInTheDocument();
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it('asks before discarding an unsaved template', async () => {
    await mount();
    fireEvent.click(
      (
        await screen.findAllByRole('button', { name: 'access.create_template' })
      )[0],
    );
    fireEvent.change(await screen.findByLabelText('access.template_name'), {
      target: { value: 'Yangi shablon' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'access.discard_title',
    });
    expect(screen.getByLabelText('access.template_name')).toHaveValue(
      'Yangi shablon',
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.discard' }),
    );
    expect(
      await screen.findByText('access.choose_template_to_edit'),
    ).toBeInTheDocument();
  });
});
