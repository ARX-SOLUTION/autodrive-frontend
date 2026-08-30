import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import GroupsPage from '@/pages/GroupsPage';
import { groupDeleteDescArgs } from '@/pages/groups/groupDeleteDescArgs';
import type { Group, GroupOverview } from '@/types/group';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// Characterization tests for GroupsPage, written BEFORE decomposing the page
// into src/pages/groups/* — they pin the page's observable behavior:
// (1) rows/cards render from list data, (2) URL params drive the useGroups
// fetch params, (3) explicit empty state, (4) role gating (delete button +
// branch filter are owner/dev-side, teacher is pinned to own branch).

const h = vi.hoisted(() => ({
  auth: { role: 'owner', branch_id: null as string | null },
  groupsData: [] as unknown[],
  overviewData: [] as unknown[],
  useGroupsSpy: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: h.auth.role, branch_id: h.auth.branch_id } }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: (params: unknown) => {
    h.useGroupsSpy(params);
    return {
      data: h.groupsData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useGroupsOverview: () => ({ data: h.overviewData }),
  useCreateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useRestoreGroup: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [
      { id: 'b1', name: 'Yunusobod filiali' },
      { id: 'b2', name: 'Chilonzor filiali' },
    ],
    isLoading: false,
  }),
}));

// GroupFormDialog (always mounted, just closed) now also calls useTeachers
// for its teacher selector (autodrive-vh0.1) -- needs stubbing same as
// groupService/branchService above, or the real hook throws for lack of a
// QueryClientProvider in this tree.
vi.mock('@/services/teacherService', () => ({
  useTeachers: () => ({ data: [] }),
}));

const GROUPS: Partial<Group>[] = [
  {
    id: 'g1',
    name: 'Alpha guruh',
    branch_id: 'b1',
    branch_name: 'Yunusobod filiali',
    course_type: 'avto_maktab',
    active_students: 12,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'g2',
    name: 'Beta guruh',
    branch_id: 'b2',
    branch_name: 'Chilonzor filiali',
    course_type: 'tezkor',
    active_students: 5,
    is_active: false,
    created_at: '2026-06-15T00:00:00.000Z',
  },
];

const OVERVIEW: Partial<GroupOverview>[] = [
  {
    branch_id: 'b1',
    branch_name: 'Yunusobod filiali',
    groups: [GROUPS[0] as Group],
  },
  {
    branch_id: 'b2',
    branch_name: 'Chilonzor filiali',
    groups: [GROUPS[1] as Group],
  },
];

const renderPage = (url = '/groups') =>
  renderWithRouter(<GroupsPage />, {
    initialEntry: url,
    routePattern: '/groups',
  });

beforeEach(() => {
  h.auth.role = 'owner';
  h.auth.branch_id = null;
  h.groupsData = GROUPS;
  h.overviewData = OVERVIEW;
  h.useGroupsSpy.mockClear();
});

afterEach(cleanup);

describe('GroupsPage rendering', () => {
  it('renders a table row and a mobile card per group', async () => {
    await renderPage();
    // DataGrid mounts only the active responsive representation.
    expect(screen.getAllByText('Alpha guruh')).toHaveLength(1);
    expect(screen.getAllByText('Beta guruh')).toHaveLength(1);
    expect(screen.getAllByText('Chilonzor filiali').length).toBeGreaterThan(0);
    // Header count reflects the full (unpaginated) list.
    expect(screen.getByText('groups.count')).toBeTruthy();
  });

  it('renders searchable branch nav and filters the list', async () => {
    h.groupsData = [];
    await renderPage();
    // No nested group dump in the nav — only branch names + counts.
    expect(screen.queryByText('Alpha guruh')).toBeNull();
    expect(
      screen.getByRole('option', { name: /Yunusobod filiali/, hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('textbox', {
        name: 'groups.branch_search',
        hidden: true,
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('option', { name: /Yunusobod filiali/, hidden: true }),
    );
    await waitFor(() => {
      const pageCall = h.useGroupsSpy.mock.calls
        .map((c) => c[0] as { branchId?: string })
        .filter((c) => 'courseType' in (c as object))
        .at(-1);
      expect(pageCall?.branchId).toBe('b1');
    });
  });

  it('sorts the complete returned list before applying client pagination', async () => {
    h.overviewData = [];
    h.groupsData = [
      ...Array.from({ length: 10 }, (_, index) => ({
        ...GROUPS[0],
        id: `g-${index + 1}`,
        name: `B${String(index + 1).padStart(2, '0')} guruh`,
      })),
      { ...GROUPS[0], id: 'g-last', name: 'A01 guruh' },
    ];

    await renderPage();

    // A01 arrived as row 11 from the endpoint. Client-owned sorting must run
    // over all returned rows before the 10-row page is selected.
    expect(screen.getAllByText('A01 guruh')).toHaveLength(1);
    expect(screen.queryByText('B10 guruh')).toBeNull();
  });
});

describe('GroupsPage URL filter params', () => {
  it('feeds q/course_type/branch_id from the URL into useGroups', async () => {
    await renderPage('/groups?q=alpha&course_type=tezkor&branch_id=b2');
    // autodrive-553: GroupFormDialog (always mounted, just closed) now also
    // calls useGroups for its own create-time duplicate check, so `.at(-1)`
    // is no longer reliably the page's call -- only the page passes
    // `courseType` explicitly.
    const lastCall = h.useGroupsSpy.mock.calls.find(
      (c) => 'courseType' in (c[0] as object),
    )?.[0];
    expect(lastCall).toEqual({
      search: 'alpha',
      branchId: 'b2',
      courseType: 'tezkor',
      includeDeleted: false,
    });
    // Search input is hydrated from the URL too.
    expect(
      screen.getByPlaceholderText<HTMLInputElement>('groups.search_placeholder')
        .value,
    ).toBe('alpha');
  });

  it('defaults to no filters for a cross-tenant owner', async () => {
    await renderPage();
    const pageCall = h.useGroupsSpy.mock.calls.find(
      (c) => 'courseType' in (c[0] as object),
    )?.[0];
    expect(pageCall).toEqual({
      search: '',
      branchId: undefined,
      courseType: undefined,
      includeDeleted: false,
    });
  });
});

describe('GroupsPage empty state', () => {
  it('shows the explicit empty state instead of a blank table', async () => {
    h.groupsData = [];
    h.overviewData = [];
    await renderPage();
    expect(screen.getByText('groups.not_found')).toBeTruthy();
  });
});

describe('GroupsPage role gating', () => {
  it('owner sees delete buttons and the branch filter select', async () => {
    await renderPage();
    expect(screen.getAllByLabelText('common.delete').length).toBeGreaterThan(0);
    // Course type is a pressed-button group; only branch select remains for cross-tenant roles.
    expect(screen.getAllByRole('combobox').length).toBe(1);
    expect(
      screen.getByRole('group', { name: 'students.course_type' }),
    ).toBeTruthy();
  });

  it('teacher gets no delete button, no branch filter, and is pinned to own branch', async () => {
    h.auth.role = 'teacher';
    h.auth.branch_id = 'b1';
    await renderPage();
    expect(screen.queryAllByLabelText('common.delete').length).toBe(0);
    // Edit stays available regardless of manageGroups.
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
    // Course type is a pressed-button group; no branch picker for teachers.
    expect(screen.queryAllByRole('combobox').length).toBe(0);
    expect(
      screen.getByRole('group', { name: 'students.course_type' }),
    ).toBeTruthy();
    // Fetch is pinned to the teacher's own branch from the auth store.
    const pageCall = h.useGroupsSpy.mock.calls.find(
      (c) => 'courseType' in (c[0] as object),
    )?.[0];
    expect(pageCall).toEqual({
      search: '',
      branchId: 'b1',
      courseType: undefined,
      includeDeleted: false,
    });
  });
});

// autodrive-cg9: delete confirmations used to say nothing about what the
// deletion affects. Group delete cascades -- groups.service.ts remove()
// unenrolls (groupId -> null) every student in the group before soft-
// deleting it -- so active_students (already rendered in the same row/card,
// see GroupsTable/GroupsMobileList "student_count" column) is a genuine
// blast-radius count, not decoration.
//
// groupDeleteDescArgs is a pure function so the branch is asserted directly
// -- the suite's react-i18next mock (src/test/setup.ts) stubs t() as
// `(key) => key`, dropping the interpolation options object entirely, so a
// rendered "12" is never observable via screen.getByText. Testing the pure
// function is the only way to actually pin the count value; the render-level
// tests below cover the (still real) risk of the wrong branch/key firing.
describe('groupDeleteDescArgs (autodrive-cg9)', () => {
  it('picks the with-students key and carries the real count for an enrolled group', () => {
    expect(
      groupDeleteDescArgs({ name: 'Alpha guruh', active_students: 12 }),
    ).toEqual({
      key: 'groups.confirm_delete_desc_with_students',
      options: { name: 'Alpha guruh', count: 12 },
    });
  });

  it('picks the empty-group key with no count for a group with zero students', () => {
    expect(
      groupDeleteDescArgs({ name: 'Beta guruh', active_students: 0 }),
    ).toEqual({
      key: 'groups.confirm_delete_desc_empty',
      options: { name: 'Beta guruh' },
    });
  });

  it('returns undefined when the group is not (yet) found', () => {
    expect(groupDeleteDescArgs(undefined)).toBeUndefined();
  });
});

describe('GroupsPage delete confirmation blast radius (autodrive-cg9)', () => {
  it('renders the with-students copy key for a group that has enrolled students', async () => {
    await renderPage();
    // GROUPS[0] (Alpha guruh) has active_students: 12 -- table row renders
    // before the mobile card list, so index 0 is its desktop delete button.
    fireEvent.click(screen.getAllByLabelText('common.delete')[0]);
    expect(
      screen.getByText('groups.confirm_delete_desc_with_students'),
    ).toBeTruthy();
    expect(screen.queryByText('groups.confirm_delete_desc_empty')).toBeNull();
  });

  it('renders the distinct empty-group copy key for a group with zero students', async () => {
    h.groupsData = [{ ...GROUPS[0], id: 'g3', active_students: 0 }];
    await renderPage();
    fireEvent.click(screen.getAllByLabelText('common.delete')[0]);
    expect(screen.getByText('groups.confirm_delete_desc_empty')).toBeTruthy();
    expect(
      screen.queryByText('groups.confirm_delete_desc_with_students'),
    ).toBeNull();
  });
});
