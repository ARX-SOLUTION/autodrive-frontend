import {
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BranchesPage from '@/features/branches/pages/BranchesPage';
import type { Branch } from '@/features/branches/types';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-cg9: owner-only "show deleted" toggle + restore on BranchesPage.
// Role-parameterized authStore mock (real permissions matrix), mirrors
// src/test/sidebarTeacherNav.test.tsx.

const auth = vi.hoisted(() => ({ role: 'owner' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: auth.role, branch_id: null },
    }),
}));

const LIVE_BRANCH: Branch = {
  id: 'br-live',
  name: 'Yunusobod filiali',
  location: 'Yunusobod 4-mavze',
  phone: '+998901234567',
  manager_name: 'Nigora Karimova',
  active_students: 12,
  created_at: '2026-01-01T00:00:00.000Z',
};

const DELETED_BRANCH: Branch = {
  ...LIVE_BRANCH,
  id: 'br-deleted',
  name: 'Chilonzor filiali (yopilgan)',
  deleted_at: '2026-07-10T00:00:00.000Z',
};

const h = vi.hoisted(() => ({
  useBranches: vi.fn(),
  restoreMutate: vi.fn(),
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: h.useBranches,
  useCreateBranch: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateBranch: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteBranch: () => ({ mutate: vi.fn(), isPending: false }),
  useRestoreBranch: () => ({ mutate: h.restoreMutate, isPending: false }),
}));

const renderPage = () => renderWithRouter(<BranchesPage />);

afterEach(() => {
  auth.role = 'owner';
  h.useBranches.mockReset();
  h.restoreMutate.mockReset();
  cleanup();
});

describe('BranchesPage "show deleted" toggle visibility (autodrive-cg9)', () => {
  it('is absent for a manager', async () => {
    auth.role = 'manager';
    h.useBranches.mockReturnValue({ data: [], isLoading: false });
    await renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is absent for an operator', async () => {
    auth.role = 'operator';
    h.useBranches.mockReturnValue({ data: [], isLoading: false });
    await renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is present for an owner', async () => {
    auth.role = 'owner';
    h.useBranches.mockReturnValue({ data: [], isLoading: false });
    await renderPage();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});

describe('BranchesPage "show deleted" toggle wiring (autodrive-cg9)', () => {
  it('flips includeDeleted through to useBranches when switched on', async () => {
    auth.role = 'owner';
    h.useBranches.mockReturnValue({ data: [], isLoading: false });
    await renderPage();

    fireEvent.click(screen.getByRole('switch'));

    const lastCall =
      h.useBranches.mock.calls[h.useBranches.mock.calls.length - 1];
    // (enabled, includeDeleted) -- includeDeleted is the 2nd positional arg.
    expect(lastCall[1]).toBe(true);
  });
});

describe('BranchesPage deleted-row rendering (autodrive-cg9)', () => {
  it('shows the deleted badge and restore action only on the deleted row', async () => {
    auth.role = 'owner';
    h.useBranches.mockReturnValue({
      data: [LIVE_BRANCH, DELETED_BRANCH],
      isLoading: false,
    });
    await renderPage();

    // DataGrid mounts only the active responsive representation.
    expect(screen.getAllByText('common.deleted')).toHaveLength(1);
    expect(screen.getAllByLabelText('common.restore')).toHaveLength(1);
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
  });

  it('hides the restore action for a non-owner even if a deleted row is present', async () => {
    auth.role = 'manager';
    h.useBranches.mockReturnValue({ data: [DELETED_BRANCH], isLoading: false });
    await renderPage();

    expect(screen.queryByLabelText('common.restore')).toBeNull();
  });
});

describe('BranchesPage restore action (autodrive-cg9)', () => {
  it('fires the restore mutation with the row id after confirming', async () => {
    auth.role = 'owner';
    h.useBranches.mockReturnValue({ data: [DELETED_BRANCH], isLoading: false });
    await renderPage();

    fireEvent.click(screen.getAllByLabelText('common.restore')[0]);
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('common.confirm_restore_desc'),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.restore' }),
    );

    await waitFor(() =>
      expect(h.restoreMutate).toHaveBeenCalledWith(
        'br-deleted',
        expect.anything(),
      ),
    );
  });
});
