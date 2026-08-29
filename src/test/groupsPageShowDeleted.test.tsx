import {
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import GroupsPage from '@/pages/GroupsPage';
import type { Group } from '@/types/group';
import type { UserRole } from '@/types/user';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-cg9: owner-only "show deleted" toggle + restore on GroupsPage.
// Role-parameterized authStore mock (real permissions matrix), mirrors
// src/test/sidebarTeacherNav.test.tsx.

let role: UserRole = 'owner';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role, branch_id: 'b1' } }),
}));

const LIVE_GROUP: Group = {
  id: 'g-live',
  name: 'Alpha guruh',
  branch_id: 'b1',
  course_type: 'tezkor',
  active_students: 5,
  is_active: true,
  created_at: '2026-07-01T00:00:00.000Z',
  teacher_id: null,
  teacher_name: null,
  schedule: [],
  students: [],
};

const DELETED_GROUP: Group = {
  ...LIVE_GROUP,
  id: 'g-deleted',
  name: 'Beta guruh',
  deleted_at: '2026-07-10T00:00:00.000Z',
};

const h = vi.hoisted(() => ({
  useGroups: vi.fn(),
  restoreMutate: vi.fn(),
}));

// Full manual mock (not importOriginal + spread) -- GroupFormDialog is
// always mounted (just closed) and calls useCreateGroup/useUpdateGroup
// itself; the real hooks throw for lack of a QueryClientProvider in this
// tree if left un-mocked (mirrors src/test/groupsPage.test.tsx).
vi.mock('@/services/groupService', () => ({
  useGroups: h.useGroups,
  useGroupsOverview: () => ({ data: [] }),
  useCreateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useRestoreGroup: () => ({ mutate: h.restoreMutate, isPending: false }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

// GroupFormDialog's teacher selector -- same reason as above.
vi.mock('@/services/teacherService', () => ({
  useTeachers: () => ({ data: [] }),
}));

const renderPage = () =>
  renderWithRouter(<GroupsPage />, {
    initialEntry: '/groups',
    routePattern: '/groups',
  });

const emptyResult = {
  data: [] as Group[],
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
};

afterEach(() => {
  role = 'owner';
  h.useGroups.mockReset();
  h.restoreMutate.mockReset();
  cleanup();
});

describe('GroupsPage "show deleted" toggle visibility (autodrive-cg9)', () => {
  it('is absent for a manager', async () => {
    role = 'manager';
    h.useGroups.mockReturnValue(emptyResult);
    await renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is absent for an operator', async () => {
    role = 'operator';
    h.useGroups.mockReturnValue(emptyResult);
    await renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is present for an owner', async () => {
    role = 'owner';
    h.useGroups.mockReturnValue(emptyResult);
    await renderPage();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});

describe('GroupsPage "show deleted" toggle wiring (autodrive-cg9)', () => {
  it('flips includeDeleted through to useGroups when switched on', async () => {
    role = 'owner';
    h.useGroups.mockReturnValue(emptyResult);
    await renderPage();

    fireEvent.click(screen.getByRole('switch'));

    // GroupFormDialog is always mounted (just closed) and calls useGroups
    // itself for its create-time duplicate check, so not every call is the
    // page's own -- only the page passes courseType explicitly (mirrors
    // src/test/groupsPage.test.tsx). Take the LAST page-originated call
    // (not just the first) since clicking the switch re-renders the page
    // with a second call.
    const pageCalls = h.useGroups.mock.calls.filter(
      (c) => 'courseType' in (c[0] as object),
    );
    expect(pageCalls.at(-1)?.[0]).toMatchObject({ includeDeleted: true });
  });
});

describe('GroupsPage deleted-row rendering (autodrive-cg9)', () => {
  it('shows the deleted badge and restore action only on the deleted row', async () => {
    role = 'owner';
    h.useGroups.mockReturnValue({
      ...emptyResult,
      data: [LIVE_GROUP, DELETED_GROUP],
    });
    await renderPage();

    // DataGrid mounts only the active responsive representation.
    expect(screen.getAllByText('common.deleted')).toHaveLength(1);
    expect(screen.getAllByLabelText('common.restore')).toHaveLength(1);
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
  });

  it('hides the restore action for a non-owner even if a deleted row is present', async () => {
    role = 'manager';
    h.useGroups.mockReturnValue({ ...emptyResult, data: [DELETED_GROUP] });
    await renderPage();

    expect(screen.queryByLabelText('common.restore')).toBeNull();
  });
});

describe('GroupsPage restore action (autodrive-cg9)', () => {
  it('fires the restore mutation with the row id after confirming', async () => {
    role = 'owner';
    h.useGroups.mockReturnValue({ ...emptyResult, data: [DELETED_GROUP] });
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
        'g-deleted',
        expect.anything(),
      ),
    );
  });
});
